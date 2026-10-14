import { Liveblocks } from "@liveblocks/node";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { requireSession } from "@/lib/auth/require-user";

// Document room ids are UUIDs (Drizzle defaultRandom). Anything else is rejected
// before any DB or Liveblocks call so room enumeration stays cheap and safe.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST authorizes one document room for the signed-in user. Requires auth.
// Returns a Liveblocks session token; 401 logged out, 403 no access, 500 unconfigured.
// Per-document gate: the caller must own the doc (personal) or share its org.
// Empty-room requests (inbox/notifications) get an identity-only session.
export async function POST(req) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return Response.json({ error: "Liveblocks not configured" }, { status: 500 });
  }
  const session = await requireSession();
  const user = session?.user ?? null;
  if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const room = typeof body.room === "string" ? body.room.trim().slice(0, 128) : "";
  const name = String(user.name ?? user.email ?? "Anonymous").slice(0, 80);
  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  try {
    const lbSession = liveblocks.prepareSession(String(user.id), {
      userInfo: { name, avatar: String(user.image ?? "") },
    });
    // No room: identity-only session for notifications. No access granted.
    if (!room) {
      const { status, body: token } = await lbSession.authorize();
      return new Response(token, { status });
    }
    if (!UUID_RE.test(room)) {
      return Response.json({ error: "Invalid room" }, { status: 400 });
    }
    // Must mirror /api/documents access: personal owner match or org id match.
    const rows = await db
      .select({
        userId: documentsTable.userId,
        orgId: documentsTable.orgId,
      })
      .from(documentsTable)
      .where(eq(documentsTable.id, room))
      .limit(1);
    const doc = rows[0];
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
    const activeOrgId = session?.session?.activeOrganizationId ?? null;
    const allowed = doc.orgId
      ? activeOrgId !== null && doc.orgId === activeOrgId
      : doc.userId === String(user.id);
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });
    lbSession.allow(room, lbSession.FULL_ACCESS);
    const { status, body: token } = await lbSession.authorize();
    return new Response(token, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authorization failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
