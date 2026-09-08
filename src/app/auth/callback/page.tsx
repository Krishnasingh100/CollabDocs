"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/sign-in");
      }
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}