"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, FileText, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
function initialOf(name, email) {
  const from = name?.trim() || email?.trim() || "?";
  return from.charAt(0).toUpperCase();
}
// Professional account menu for the top-right corner: avatar button with
// name/email header, quick links, and sign out.
export function AccountMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
  if (isPending) {
    return <span aria-hidden="true" className="size-8 animate-pulse rounded-full bg-muted" />;
  }
  // No session in app headers means auth is not configured (the proxy would
  // otherwise have redirected to sign-in): local workspace.
  if (!session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account"
          title="Account"
          className="flex size-8 items-center justify-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CircleUserRound className="size-5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Local workspace</span>
              <span className="text-xs font-normal text-muted-foreground">
                Sign-in is not configured
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={
              <Link href="/sign-in">
                <CircleUserRound />
                <span>Sign in</span>
              </Link>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const { name, email, image } = session.user;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        title={email ?? name ?? "Account"}
        className="rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar>
          {image && <AvatarImage src={image} alt={name ?? email ?? "Account"} />}
          <AvatarFallback>{initialOf(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5">
            <Avatar>
              {image && <AvatarImage src={image} alt="" />}
              <AvatarFallback>{initialOf(name, email)}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {name ?? "My account"}
              </span>
              {email && (
                <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
              )}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/documents">
              <FileText />
              <span>My documents</span>
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
