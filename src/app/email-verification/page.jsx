"use client";

import { useEffect } from "react";
import { AuthView } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

// The prebuilt sign-up form only navigates here after creating the account;
// it never sends the verification code itself (only the Resend button does).
// Sending it on arrival makes "Create account" deliver the code right away.
// A per-tab session marker stops duplicate sends when the page is refreshed;
// the built-in Resend button still works for anything else.
export default function EmailVerificationPage() {
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email");
    if (!email) return;
    const marker = `collabdocs:otp-sent:${email}`;
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, "1");
    authClient.emailOtp
      .sendVerificationOtp({ email, type: "email-verification" })
      .catch(() => {
        // Best-effort: the user can still press Resend on the form.
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <AuthView view="EMAIL_VERIFICATION" />
    </main>
  );
}
