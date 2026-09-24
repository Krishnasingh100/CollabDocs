"use server";
import { redirect } from "next/navigation";
import { sendPasswordResetOtp } from "@/lib/auth/otp";
export async function forgotPasswordAction(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email." };
  }
  try {
    await sendPasswordResetOtp(email);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not send the code." };
  }
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}
