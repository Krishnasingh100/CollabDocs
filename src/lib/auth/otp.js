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
// Takes email, sends verification code for new accounts. Returns auth response.
export function sendVerificationOtp(email) {
  return post("/email-otp/send-verification-otp", { email, type: "email-verification" });
}
// Takes email, sends reset code for password recovery. Returns auth response.
export function sendPasswordResetOtp(email) {
  return post("/email-otp/send-verification-otp", { email, type: "forget-password" });
}
// Takes email and code, marks the account email verified. Returns auth response.
// Uses /email-otp/verify-email: unlike /check-verification-otp it persists
// emailVerified=true, which unblocks password sign-in afterwards.
export function verifyEmailOtp(email, otp) {
  return post("/email-otp/verify-email", { email, otp });
}
// Takes email, code, and password, resets password. Returns auth response.
export function resetPasswordWithOtp(email, otp, password) {
  return post("/email-otp/reset-password", { email, otp, password });
}
