import { createNeonAuth } from "@neondatabase/auth/next/server";

// Single server-side auth instance: API handler, route protection,
// sessions, and email/password methods all come from here.
// Needs NEON_AUTH_BASE_URL + NEON_AUTH_COOKIE_SECRET (see .env.example).
//
// Build-safe: `next build` collects /api/auth/[...path] without live env.
// Fallback placeholders let build pass; runtime calls still need real env.
// Missing env logs a warning once.
const baseUrl =
  process.env.NEON_AUTH_BASE_URL ?? "https://placeholder.neonauth.local/auth";
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ??
  "placeholder-secret-32-chars-minimum-000000";

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
