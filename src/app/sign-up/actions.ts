"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

function friendlyAuthError(raw: string): string {
  // DNS failure means the app is still pointed at the placeholder auth
  // host: Neon Auth was never configured in .env.
  if (raw.includes("Could not resolve authentication server hostname")) {
    return "Cannot reach the auth server — Neon Auth is not configured. Add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to .env, then restart the dev server.";
  }
  return raw;
}

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
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
        e instanceof Error
          ? e.message
          : "Auth service unreachable. Check Neon Auth env.",
      ),
    };
  }
  redirect("/documents");
}
