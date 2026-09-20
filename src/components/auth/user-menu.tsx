"use client";

import { useRouter } from "next/navigation";
import { Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  if (isPending) {
    return (
      <span className="px-2 text-xs text-muted-foreground">Loading…</span>
    );
  }

  // No session in the sidebar means auth is not configured (the proxy would
  // otherwise have redirected to sign-in), so this is a local workspace.
  if (!session?.user) {
    return (
      <div className="flex items-center gap-2 px-2">
        <Database className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Local workspace
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {session.user.email ?? "Signed in"}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        onClick={signOut}
      >
        <LogOut />
      </Button>
    </div>
  );
}
