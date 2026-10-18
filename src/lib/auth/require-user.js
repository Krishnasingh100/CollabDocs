import { cache } from "react";
import { auth } from "./server";
// Shared owner id for local dev without auth env. Still uses real database.
export const LOCAL_OWNER_ID = "local-dev";
// Takes nothing, checks Neon Auth env presence. Returns true when configured.
export function isAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}
// Cache the session read per server request: a render that calls both the
// auth check and the workspace resolution hits Neon Auth once, not twice.
const getSessionCached = cache(() => auth.getSession().catch(() => ({ data: null })));
// Takes nothing, reads signed-in session for workspace scope. Returns session or null.
// Returns null on missing env or network failure for localStorage fallback.
export async function requireSession() {
  const { data: session } = await getSessionCached();
  return session ?? null;
}
// Takes nothing, reads signed-in user for API guards. Returns user or null.
// Returns null on missing env or network failure for localStorage fallback.
export async function requireUser() {
  const session = await requireSession();
  return session?.user ?? null;
}
// Takes nothing, picks workspace from session: active org, personal, or local-dev. Returns workspace or null.
// Returns null when logged out with auth configured so callers answer 401.
export async function resolveWorkspace() {
  const session = await requireSession();
  const user = session?.user ?? null;
  if (user) {
    const organizationId = session?.session?.activeOrganizationId ?? null;
    if (organizationId) return { kind: "organization", organizationId, userId: user.id };
    return { kind: "personal", ownerId: user.id, userId: user.id };
  }
  if (!isAuthConfigured()) return { kind: "personal", ownerId: LOCAL_OWNER_ID, userId: null };
  return null;
}
// Takes nothing, picks owner bucket for documents query. Returns owner id or null.
// Returns null when logged out with auth configured so callers answer 401.
export async function resolveOwner() {
  const workspace = await resolveWorkspace();
  if (!workspace) return null;
  if (workspace.kind === "organization") return { ownerId: workspace.userId };
  return { ownerId: workspace.ownerId };
}
