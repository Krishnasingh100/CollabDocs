import { auth } from "@/lib/auth/server";
// GET/POST proxies Managed Better Auth API through /api/auth/*. Public scope.
// Returns auth JSON from Better Auth handler.
export const { GET, POST } = auth.handler();
