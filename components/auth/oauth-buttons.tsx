"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function OAuthButtons() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
     await authClient.signIn.social({
  provider: "google",
  callbackURL: `${window.location.origin}/auth/callback`,
});
    } catch (error) {
      console.error("Google sign-in error:", error);
      setLoading(false);
    }
  }
  

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={handleGoogleSignIn}
      >
        Continue with Google
      </Button>
    </div>
  );
}