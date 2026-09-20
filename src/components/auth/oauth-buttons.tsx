"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
] as const;

type Provider = (typeof PROVIDERS)[number]["id"];

// Google works in development with Neon's shared credentials.
// GitHub needs your own OAuth app: Neon Console → Auth → providers.
export function OAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: Provider) => {
    setPending(provider);
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/documents",
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "OAuth sign-in failed.";
      // DNS failure means the app is still pointed at the placeholder auth
      // host: Neon Auth was never configured in .env.
      setError(
        raw.includes("Could not resolve authentication server hostname")
          ? "Cannot reach the auth server — Neon Auth is not configured. Add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET to .env, then restart the dev server."
          : raw,
      );
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((p) => (
        <Button
          key={p.id}
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => signIn(p.id)}
        >
          {pending === p.id ? "Redirecting…" : p.label}
        </Button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
