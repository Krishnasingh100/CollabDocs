import { auth } from "@/lib/auth/server";
// GET/POST proxies Managed Better Auth API through /api/auth/*. Public scope.
// Some browsers (in-app browsers, WebViews, privacy modes) send "Origin: null"
// on fetch POSTs, and the Neon Auth server rejects that with
// MISSING_OR_NULL_ORIGIN — which broke OTP resend and code verification.
// Normalizing a missing or null Origin to this app's own origin keeps the
// server's CSRF origin check meaningful (it still verifies the origin against
// its trusted-domains list) while fixing those browsers.
const handlers = auth.handler();
function normalizeOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") return request;
  const headers = new Headers(request.headers);
  headers.set("origin", new URL(request.url).origin);
  return new Request(request, { headers });
}
export const GET = (request, context) => handlers.GET(normalizeOrigin(request), context);
export const POST = (request, context) => handlers.POST(normalizeOrigin(request), context);
