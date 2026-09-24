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
export async function signInWithEmail(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  try {
    const { error } = await auth.signIn.email({ email, password });
    if (error) {
      const raw = error.message || "Failed to sign in.";
      // Unverified accounts finish verification first, then sign in.
      if (/verif/i.test(raw)) {
        try {
          await sendVerificationOtp(email);
        } catch {
          // code can be resent from the verify page
        }
        redirect(`/verify-email?email=${encodeURIComponent(email)}`);
      }
      return { error: friendlyAuthError(raw) };
    }
  } catch (e) {
    return {
      error: friendlyAuthError(
        e instanceof Error ? e.message : "Auth service unreachable. Check Neon Auth env.",
      ),
    };
  }
  redirect("/documents");
}
