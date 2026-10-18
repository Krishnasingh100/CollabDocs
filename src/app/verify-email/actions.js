"use server";
import { redirect } from "next/navigation";
import { sendVerificationOtp, verifyEmailOtp } from "@/lib/auth/otp";
// Takes email and code, marks the account verified. Returns error or sign-in redirect.
// Verification creates no session, so the user finishes by signing in with the
// password they chose; the email is prefilled and the notice confirms success.
export async function verifyOtpAction(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");
  if (!email || otp.length !== 6) {
    return { error: "Enter your email and the 6-digit code." };
  }
  try {
    await verifyEmailOtp(email, otp);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Code check failed. Try again." };
  }
  redirect(`/sign-in?verified=1&email=${encodeURIComponent(email)}`);
}
// Takes email, resends verification code. Returns sent flag or error.
export async function resendOtpAction(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email first." };
  }
  try {
    await sendVerificationOtp(email);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not resend the code." };
  }
  return { sent: true };
}
