"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const WORKSPACE_CHANGED_EVENT = "workspace-changed";

// Takes nothing, broadcasts workspace change event. Returns nothing.
export function notifyWorkspaceChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT));
  }
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "org"
  );
}

function extractError(result, fallback) {
  const error = result?.error;
  if (!error) return null;
  if (typeof error.message === "string" && error.message) return error.message;
  return fallback;
}

// Takes a create/list result; returns the organization payload or null.
function readOrg(result) {
  if (!result) return null;
  return result?.data ?? null;
}

// Takes optional menu side, switches personal and org workspaces. Returns switcher UI.
// Sets active org in session cookie so documents API scopes correctly.
export function WorkspaceSwitcher({ menuSide = "bottom" }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [switching, setSwitching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [logo, setLogo] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [switchError, setSwitchError] = useState(null);

  const user = session?.user ?? null;
  const orgs = Array.isArray(organizations) ? organizations : [];
  const activeOrg = activeOrganization ?? null;

  // Signed out (local workspace): no switching available.
  if (!user) {
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <UserRound className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium text-foreground">Personal</span>
          <span className="truncate text-[11px] text-muted-foreground">Local workspace</span>
        </span>
      </div>
    );
  }

  const switchWorkspace = async (organizationId) => {
    setSwitching(true);
    setSwitchError(null);
    try {
      const result = await authClient.organization.setActive({ organizationId });
      const failure = extractError(result, "Could not switch workspace.");
      if (failure) {
        setSwitchError(failure);
        return;
      }
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "Could not switch workspace.");
      return;
    } finally {
      setSwitching(false);
    }
    notifyWorkspaceChanged();
    router.refresh();
  };

  const openCreate = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setLogo("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const createOrganization = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const finalSlug = slug.trim() || slugify(trimmedName);
      const trimmedLogo = logo.trim();
      const result = await authClient.organization.create({
        name: trimmedName,
        slug: finalSlug,
        ...(trimmedLogo ? { logo: trimmedLogo } : {}),
      });
      const failure = extractError(result, "Could not create the organization.");
      if (failure) {
        setCreateError(failure);
        return;
      }
      // Enters the new workspace at once; otherwise documents keep saving
      // to personal until the user switches by hand.
      const created = readOrg(result);
      const createdId = created?.id ?? null;
      if (createdId) {
        try {
          await authClient.organization.setActive({ organizationId: createdId });
        } catch {
          // Created already; workspace refresh picks up membership.
        }
      }
      setCreateOpen(false);
      notifyWorkspaceChanged();
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create the organization.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Switch workspace"
          disabled={switching}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {activeOrg ? <Building2 className="size-4" /> : <UserRound className="size-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-foreground">
              {activeOrg ? "Organization" : "Personal"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {activeOrg ? activeOrg.name : (user.email ?? "Only you")}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side={menuSide} className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => switchWorkspace(null)}>
              <UserRound />
              <span className="min-w-0 flex-1">
                <span className="block truncate">Personal</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email ?? "Only you"}
                </span>
              </span>
              {!activeOrg && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
            {orgs.map((org) => (
              <DropdownMenuItem key={org.id} onClick={() => switchWorkspace(org.id)}>
                <Building2 />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{org.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{org.slug}</span>
                </span>
                {activeOrg?.id === org.id && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openCreate}>
              <Plus />
              <span>Create organization</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {switchError && (
            <p role="alert" className="px-2 py-1.5 text-xs text-destructive">
              {switchError}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Organizations get a shared document workspace. Invite people after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Acme Studio"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme-studio"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens. Used for invitations.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-logo">Logo URL (optional)</Label>
              <Input
                id="org-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://…"
                inputMode="url"
                autoComplete="off"
              />
            </div>
            {createError && (
              <p role="alert" className="text-sm text-destructive">
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={createOrganization} disabled={!name.trim() || creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
