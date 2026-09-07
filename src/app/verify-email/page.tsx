"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await authClient.emailOtp.checkVerificationOtp({
      email,
      otp: code,
      type: "email-verification",
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Invalid or expired code.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResend() {
    await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setResent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-medium text-foreground">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code we sent to {email || "your email"}.
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded border border-border px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-primary"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <button
          onClick={handleResend}
          className="mt-4 w-full text-center text-sm text-primary hover:underline"
        >
          {resent ? "Code resent" : "Resend code"}
        </button>
      </div>
    </div>
  );
}