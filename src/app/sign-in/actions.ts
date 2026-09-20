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

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  try {
    const { error } = await auth.signIn.email({ email, password });
    if (error) {
      return { error: friendlyAuthError(error.message || "Failed to sign in.") };
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
