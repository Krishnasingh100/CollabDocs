import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
// Next 16 proxy redirects logged-out visitors; API routes return 401 JSON instead.
// Passes through without auth env for localStorage fallback.
const guard = auth.middleware({
  loginUrl: "/sign-in",
});
// Takes request, enforces sign-in for document pages. Returns redirect or next response.
export default function proxy(req) {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    return NextResponse.next();
  }
  return guard(req);
}
export const config = {
  matcher: ["/documents/:path*", "/__proxy_probe__"],
};
