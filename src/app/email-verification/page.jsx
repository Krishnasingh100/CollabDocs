"use client";

import { useEffect } from "react";
import { AuthView } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

// The prebuilt sign-up form only navigates here after creating the account;
// it never sends the verification code itself (only the Resend button does).
// Sending it on arrival makes "Create account" deliver the code right away.
// The success marker is written only AFTER the send actually succeeds, and a
// failed attempt retries once: a network hiccup (or Next's RSC-prefetch
// fallback reload) no longer leaves the page waiting for a code that was
// never sent. The built-in Resend button stays as the manual fallback.
let otpInflight = false;
export default function EmailVerificationPage() {
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email");
    if (!email) return;
    const marker = `collabdocs:otp-sent:${email}`;
    if (sessionStorage.getItem(marker) === "1" || otpInflight) return;
    let cancelled = false;
    const send = async (attempt) => {
      otpInflight = true;
      try {
        await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
        if (!cancelled) sessionStorage.setItem(marker, "1");
      } catch {
        if (attempt < 1 && !cancelled) {
          setTimeout(() => void send(attempt + 1), 1500);
          return;
        }
        // Left to the Resend button so the user always has a manual path.
      } finally {
        otpInflight = false;
      }
    };
    void send(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <AuthView view="EMAIL_VERIFICATION" />
    </main>
  );
}
