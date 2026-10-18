import { Liveblocks } from "@liveblocks/node";
import { requireSession } from "@/lib/auth/require-user";

// POST fans out one org notification to member ids the caller already has from
// the auth client (managed Better Auth data lives outside this database, so
// member lists cannot be re-verified server-side here). Validation kept strict:
// the requester must currently hold activeOrganizationId === orgId, kinds are
// whitelisted, targets are clamped and the requester is always excluded.
const KIND_KINDS = new Set(["$orgDocumentCreated", "$orgMemberJoined"]);
const MAX_TARGETS = 50;

function cleanText(value, max) {
  return String(value ?? "").slice(0, max);
}

export async function POST(req) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return Response.json({ error: "Liveblocks not configured" }, { status: 500 });
  }
  const session = await requireSession();
  const user = session?.user ?? null;
  if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const activeOrgId = session?.session?.activeOrganizationId ?? null;
  if (!activeOrgId) return Response.json({ error: "No active organization" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "");
  const orgId = String(body.orgId ?? "");
  if (!KIND_KINDS.has(kind)) return Response.json({ error: "Unknown kind" }, { status: 400 });
  if (orgId !== activeOrgId) {
    return Response.json({ error: "Forbidden for this organization" }, { status: 403 });
  }

  const targets = (Array.isArray(body.targets) ? body.targets : [])
    .map((id) => String(id ?? ""))
    .filter(Boolean)
    .filter((id) => id !== String(user.id))
    .slice(0, MAX_TARGETS);
  if (targets.length === 0) return Response.json({ ok: true, sent: 0 });

  const orgName = cleanText(body.orgName, 120);
  const actorName = cleanText(user.name ?? user.email ?? "A teammate", 80);
  const documentId =
    kind === "$orgDocumentCreated" && body.documentId
      ? cleanText(body.documentId, 64)
      : null;
  const documentTitle =
    kind === "$orgDocumentCreated" ? cleanText(body.documentTitle, 255) : undefined;
  const subjectId = `org:${orgId}:${documentId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
  const activityData =
    kind === "$orgDocumentCreated"
      ? { orgId, orgName, documentId, documentTitle, creatorName: actorName }
      : { orgId, orgName, memberName: actorName };

  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  const results = await Promise.allSettled(
    targets.map((userId) =>
      liveblocks.triggerInboxNotification({
        userId,
        kind,
        subjectId,
        activityData,
      }),
    ),
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  if (sent === 0 && results.length > 0) {
    const firstError = results[0]?.reason;
    return Response.json(
      { error: firstError instanceof Error ? firstError.message : "Liveblocks failed" },
      { status: 502 },
    );
  }
  return Response.json({ ok: true, sent });
}
