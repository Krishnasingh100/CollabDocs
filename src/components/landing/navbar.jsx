"use client";
import Link from "next/link";
import { FileText } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Takes no props, shows nav with auth-aware links. Returns header UI.
export function Navbar() {
  const { data: session } = authClient.useSession();
  const user = session?.user ?? null;
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4"
      >
        <Link href={user ? "/documents" : "/"} className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <span>CollabDocs</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/documents" className={cn(buttonVariants({ size: "sm" }))}>
              Open documents
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
