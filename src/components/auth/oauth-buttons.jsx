"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
// Google-only sign-in. GitHub removed: it needs a custom OAuth app in
// Neon Console, Google works with shared credentials.
export function OAuthButtons() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const signIn = async () => {
    setPending(true);
    setError(null);
    // Direct POST instead of authClient.signIn.social: full control over
    // timeout and navigation, no infinite "Redirecting…" state.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/documents",
          newUserCallbackURL: "/documents",
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Request failed (${res.status}).`);
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error("No redirect URL returned. Try again.");
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Google sign-in timed out. Check your connection and retry.");
      } else {
        const raw = e instanceof Error ? e.message : "OAuth sign-in failed.";
        // DNS failure means the app is still pointed at the placeholder auth
        // host: Neon Auth was never configured in .env.
        setError(
          raw.includes("Could not resolve authentication server hostname")
            ? "Cannot reach the sign-in service — auth is not configured for this app. (Owner: set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, then redeploy.)"
            : raw,
        );
      }
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="w-full" disabled={pending} onClick={signIn}>
        <GoogleIcon />
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
