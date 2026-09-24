// Server-only helpers for Neon Auth email-OTP flows (verification codes
// and password reset). Never import this module from client components.
function baseUrl() {
  const url = process.env.NEON_AUTH_BASE_URL;
  if (!url) {
    throw new Error(
      "Cannot reach the sign-in service — auth is not configured for this app. (Owner: set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, then redeploy.)",
    );
  }
  return url.replace(/\/$/, "");
}
async function post(path, body) {
  let res;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Auth service unreachable. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${res.status}).`);
  }
  return data;
}
// 6-digit code for first-time email verification.
export function sendVerificationOtp(email) {
  return post("/email-otp/send-verification-otp", { email, type: "email-verification" });
}
// 6-digit code for password reset (link reset is disabled on this project).
export function sendPasswordResetOtp(email) {
  return post("/email-otp/send-verification-otp", { email, type: "forget-password" });
}
export function checkVerificationOtp(email, otp) {
  return post("/email-otp/check-verification-otp", { email, otp, type: "email-verification" });
}
export function resetPasswordWithOtp(email, otp, password) {
  return post("/email-otp/reset-password", { email, otp, password });
}
