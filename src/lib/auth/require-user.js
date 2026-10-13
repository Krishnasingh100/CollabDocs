import { auth } from "./server";
// Owner id used for documents created while Neon Auth is not configured
// (local development). Everything is stored in the real Neon database, just
// under one shared owner instead of per-user owners.
export const LOCAL_OWNER_ID = "local-dev";
export function isAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}
// Returns the full signed-in session (user plus session fields such as the
// active organization id), or null. Never throws: missing/invalid Neon Auth
// env or network failure means "no session" so the client falls back to its
// localStorage copy.
export async function requireSession() {
  try {
    const { data: session } = await auth.getSession();
    return session ?? null;
  } catch {
    return null;
  }
}
// Returns the signed-in user, or null. API routes answer 401 when null
// so logged-out fetch calls get JSON instead of a login redirect.
// Never throws: missing/invalid Neon Auth env or network failure means
// "no session" so the client falls back to its localStorage copy.
export async function requireUser() {
  const session = await requireSession();
  return session?.user ?? null;
}
// Resolves which workspace a documents API call belongs to.
// - Signed in with an active organization → that organization. The active
//   organization id comes from the signed session cookie, which the Neon Auth
//   service only sets after verifying membership at set-active time, so no
//   extra membership fetch is needed per documents request.
// - Signed in without an active organization → the user's personal workspace
//   (documents with no organization id, visible only to the creator).
// - Not signed in + auth not configured → shared "local-dev" bucket, so the
//   app still persists to the real database during local development.
// - Not signed in + auth configured → null, callers answer 401.
// Never throws.
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
// Resolves which owner bucket a documents API call belongs to.
// - Signed in → that user's id (per-user isolation).
// - Not signed in + auth not configured → shared "local-dev" bucket, so the
//   app still persists to the real database during local development.
// - Not signed in + auth configured → null, callers answer 401.
// Never throws.
export async function resolveOwner() {
  const workspace = await resolveWorkspace();
  if (!workspace) return null;
  if (workspace.kind === "organization") return { ownerId: workspace.userId };
  return { ownerId: workspace.ownerId };
}
