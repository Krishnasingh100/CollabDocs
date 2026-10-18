import { NextResponse } from "next/server";
// Next 16 proxy redirects logged-out visitors; API routes return 401 JSON instead.
// Passes through without auth env for localStorage fallback.
//
// Network-free guard: a Neon Auth (Better Auth) sign-in always leaves a
// `…session_token…` cookie in the jar, and sign-out removes both session
// cookies, so cookie presence is a reliable, instant signal. The remote
// (upstream) session check still happens where it matters — every API route
// 401s and page.jsx requires a live session — so this gate never needs a
// network round trip in middleware, which is what used to hang the first
// /documents paint on cold starts (Chrome's net::ERR_HTTP2_PING_FAILED).
const looksSignedIn = (cookieHeader) => {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some((pair) => pair.includes("session_token"));
};
// Takes request, enforces sign-in for document pages. Returns redirect or next response.
export default function proxy(req) {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    return NextResponse.next();
  }
  if (looksSignedIn(req.headers.get("cookie"))) {
    return NextResponse.next();
  }
  // Build the target from the request's own origin so production gets a real
  // location (https://app/sign-in), never the placeholder base.
  const target = new URL("/sign-in", req.url);
  target.search = new URL(req.url).search;
  return NextResponse.redirect(target);
}
export const config = {
  // Documents only. /share links are public read-only pages and stay open for
  // logged-out visitors, so they are deliberately not matched here.
  matcher: ["/documents/:path*"],
};
