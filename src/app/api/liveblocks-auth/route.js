import { Liveblocks } from "@liveblocks/node";
import { requireSession } from "@/lib/auth/require-user";

// POST authorizes one document room for the signed-in user. Requires auth.
// Returns a Liveblocks session token; 401 when logged out, 500 when unconfigured.
// Presence-only gate for now: any signed-in user may join a room. Document
// content stays gated by /api/documents. Strict per-document membership
// lands with Yjs sync, where room access must mirror workspace scope.
export async function POST(req) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return Response.json({ error: "Liveblocks not configured" }, { status: 500 });
  }
  const session = await requireSession();
  const user = session?.user ?? null;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const room = typeof body.room === "string" ? body.room : "";
  if (!room) return Response.json({ error: "Missing room" }, { status: 400 });
  const name = String(user.name ?? user.email ?? "Anonymous").slice(0, 80);
  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  try {
    const lbSession = liveblocks.prepareSession(String(user.id), {
      userInfo: { name, avatar: String(user.image ?? "") },
    });
    lbSession.allow(room, lbSession.FULL_ACCESS);
    const { status, body: token } = await lbSession.authorize();
    return new Response(token, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authorization failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
