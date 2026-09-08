"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Share2, Copy, Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = {
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
};

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "commenter", label: "Commenter" },
  { value: "editor", label: "Editor" },
];

export function ShareDialog({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [linkAccess, setLinkAccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadMembers() {
    const res = await fetch(`/api/sharing?documentId=${documentId}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/sharing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, email, role }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error === "No account found with that email"
        ? "No CollabDocs account with that email yet."
        : data.error ?? "Could not send invite.");
      return;
    }

    setEmail("");
    loadMembers();
  }

  async function handleLinkAccessChange(value: string) {
    const newValue = value === "off" ? null : value;
    setLinkAccess(newValue);
    await fetch("/api/sharing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, linkAccess: newValue }),
    });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/document/${documentId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function initials(name: string | null, email: string) {
    return (name ?? email).slice(0, 1).toUpperCase();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" nativeButton={false} />}
      >
        <Share2 className="h-4 w-4" />
        Share
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Share document</DialogTitle>
          <DialogDescription>
            Invite people to view, comment on, or edit this document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="flex items-center gap-2">
          <Input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Inviting…" : "Invite"}
          </Button>
        </form>
        {error && <p className="-mt-2 text-sm text-destructive">{error}</p>}

        {members.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              People with access
            </p>
            <div className="max-h-48 space-y-3 overflow-y-auto">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {initials(m.name, m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-none">
                      {m.name ?? m.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span>Anyone with the link</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={linkAccess ?? "off"}
              onChange={(e) => handleLinkAccessChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none"
            >
              <option value="off">No access</option>
              <option value="viewer">Can view</option>
              <option value="commenter">Can comment</option>
              <option value="editor">Can edit</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={cn(copied && "text-primary")}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}