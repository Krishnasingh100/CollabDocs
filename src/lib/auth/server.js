import "@/lib/network";
import { createNeonAuth } from "@neondatabase/auth/next/server";
// Server auth instance for API handler, sessions, and email methods. Needs Neon Auth env.
// Uses placeholders at build time so `next build` passes without live env.
const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "https://placeholder.neonauth.local/auth";
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ?? "placeholder-secret-32-chars-minimum-000000";
if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
  console.warn(
    "[auth] NEON_AUTH_BASE_URL or NEON_AUTH_COOKIE_SECRET missing. Build continues with placeholder; runtime auth needs real values from Neon Dashboard → Auth → Configuration.",
  );
}
export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
  },
});
