"use server";
import { redirect } from "next/navigation";
import { resetPasswordWithOtp } from "@/lib/auth/otp";
export async function resetPasswordAction(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");
  const password = String(formData.get("password") ?? "");
  if (!email || otp.length !== 6) {
    return { error: "Enter your email and the 6-digit code." };
  }
  if (password.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  try {
    await resetPasswordWithOtp(email, otp, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Reset failed. Try again." };
  }
  redirect("/sign-in");
}
