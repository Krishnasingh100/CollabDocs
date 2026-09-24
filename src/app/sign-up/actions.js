"use server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { sendVerificationOtp } from "@/lib/auth/otp";
function friendlyAuthError(raw) {
  // DNS failure means the app is still pointed at the placeholder auth
  // host: Neon Auth was never configured for this deployment.
  if (raw.includes("Could not resolve authentication server hostname")) {
    return "Cannot reach the sign-in service — auth is not configured for this app. (Owner: set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, then redeploy.)";
  }
  return raw;
}
export async function signUpWithEmail(_prevState, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  try {
    const { error } = await auth.signUp.email({ email, password, name });
    if (error) {
      return { error: friendlyAuthError(error.message || "Failed to create account.") };
    }
  } catch (e) {
    return {
      error: friendlyAuthError(
        e instanceof Error ? e.message : "Auth service unreachable. Check Neon Auth env.",
      ),
    };
  }
  // New accounts verify by email code before entering the app.
  try {
    await sendVerificationOtp(email);
  } catch {
    // code can be resent from the verify page
  }
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}
