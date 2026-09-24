"use server";
import { redirect } from "next/navigation";
import { checkVerificationOtp, sendVerificationOtp } from "@/lib/auth/otp";
export async function verifyOtpAction(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");
  if (!email || otp.length !== 6) {
    return { error: "Enter your email and the 6-digit code." };
  }
  try {
    await checkVerificationOtp(email, otp);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Code check failed. Try again." };
  }
  redirect("/documents");
}
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
