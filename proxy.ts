import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

// Next 16: proxy.ts replaces middleware.ts. Redirects logged-out
// visitors on document pages to sign-in. API routes guard themselves
// with auth.getSession() so fetch calls get 401 JSON, not redirects.
//
// Local dev without Neon Auth env: pass through so the editor still
// works against its localStorage fallback instead of redirect-looping
// to a sign-in page whose backend is unreachable.
const guard = auth.middleware({
  loginUrl: "/sign-in",
});

export default function proxy(req: NextRequest) {
  if (
    !process.env.NEON_AUTH_BASE_URL ||
    !process.env.NEON_AUTH_COOKIE_SECRET
  ) {
    return NextResponse.next();
  }
  return guard(req);
}

export const config = {
  matcher: ["/documents/:path*"],
};
