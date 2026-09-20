import { auth } from "./server";

// Owner id used for documents created while Neon Auth is not configured
// (local development). Everything is stored in the real Neon database, just
// under one shared owner instead of per-user owners.
export const LOCAL_OWNER_ID = "local-dev";

export function isAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}

// Returns the signed-in user, or null. API routes answer 401 when null
// so logged-out fetch calls get JSON instead of a login redirect.
// Never throws: missing/invalid Neon Auth env or network failure means
// "no session" so the client falls back to its localStorage copy.
export async function requireUser() {
  try {
    const { data: session } = await auth.getSession();
    return session?.user ?? null;
  } catch {
    return null;
  }
}

// Resolves which owner bucket a documents API call belongs to.
// - Signed in → that user's id (per-user isolation).
// - Not signed in + auth not configured → shared "local-dev" bucket, so the
//   app still persists to the real database during local development.
// - Not signed in + auth configured → null, callers answer 401.
// Never throws.
export async function resolveOwner(): Promise<{ ownerId: string } | null> {
  const user = await requireUser();
  if (user) return { ownerId: user.id };
  if (!isAuthConfigured()) return { ownerId: LOCAL_OWNER_ID };
  return null;
}
