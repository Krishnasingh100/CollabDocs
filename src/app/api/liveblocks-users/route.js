import { requireSession } from "@/lib/auth/require-user";

// POST resolves Liveblocks userIds to display info for avatars/mentions.
// Takes { userIds: string[] }. Returns { data: [{ name, avatar }] } in order.
// Known user: current session. Unknown ids: safe "Collaborator" fallback so
// no emails or internal ids leak and resolveUsers never 500s.
export async function POST(req) {
  const session = await requireSession();
  const user = session?.user ?? null;
  if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds) ? body.userIds.slice(0, 50) : [];
  const selfName = String(user.name ?? user.email ?? "Collaborator").slice(0, 80);
  const selfAvatar = String(user.image ?? "");
  const data = userIds.map((id) => {
    const sid = String(id ?? "");
    if (sid === String(user.id)) return { name: selfName, avatar: selfAvatar };
    const short = sid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "user";
    return { name: `Collaborator ${short}`, avatar: "" };
  });
  return Response.json({ data });
}
