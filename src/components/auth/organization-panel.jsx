"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, LogOut, Mail, UserPlus, Users, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { notifyWorkspaceChanged } from "@/components/auth/workspace-switcher";
import { sendOrgNotification } from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initialOf(value) {
  const from = value?.trim() || "?";
  return from.charAt(0).toUpperCase();
}

function readData(result) {
  if (!result) return null;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return result?.data ?? null;
}

function readError(result, fallback) {
  const error = result?.error;
  if (!error) return null;
  if (typeof error.message === "string" && error.message) return error.message;
  return fallback;
}

// Takes no props, manages org members, invites, and inbox. Returns people dialog UI.
// Hides in personal workspace unless pending invitations exist.
export function OrganizationPanel() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionDone, setActionDone] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveArmed, setLeaveArmed] = useState(false);
  const [busyInvitation, setBusyInvitation] = useState(null);

  const user = session?.user ?? null;
  const activeOrg = activeOrganization ?? null;
  const members = Array.isArray(activeOrg?.members) ? activeOrg.members : [];
  const sentInvites = Array.isArray(activeOrg?.invitations) ? activeOrg.invitations : [];

  const refreshInbox = useCallback(async () => {
    if (!user) return;
    setInboxLoading(true);
    try {
      const result = await authClient.organization.listUserInvitations();
      const data = readData(result);
      setInbox(Array.isArray(data) ? data : []);
    } catch {
      // Inbox is best-effort; the panel still shows members.
    } finally {
      setInboxLoading(false);
    }
  }, [user]);

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) {
      setActionError(null);
      setActionDone(null);
      setLeaveArmed(false);
      void refreshInbox();
    }
  };

  // Loads pending invitations on mount so the Invites entry appears even in
  // the personal workspace. Without this the dialog stays unreachable.
  // States update only in the fetch continuation, never synchronously.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await authClient.organization.listUserInvitations();
        if (cancelled) return;
        const data = readData(result);
        setInbox(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setInbox([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const afterWorkspaceChange = () => {
    notifyWorkspaceChanged();
    router.refresh();
  };

  // Best-effort ping after this user accepts an invite: tells the other org
  // members "$orgMemberJoined" with member ids from the org profile dialog.
  // Does not force a member fetch that would slow the accept flow.
  const announceJoinToOrg = async () => {
    try {
      const result = await authClient.organization.getFullOrganization();
      const org = readData(result);
      const targets = (Array.isArray(org?.members) ? org.members : [])
        .map((m) => m?.userId ?? m?.user?.id)
        .filter(Boolean)
        .filter((id) => id !== user?.id);
      if (!org?.id || targets.length === 0) return;
      void sendOrgNotification({
        kind: "$orgMemberJoined",
        orgId: org.id,
        orgName: org.name,
        targets,
      });
    } catch {
      // Notification is optional; joining already succeeded.
    }
  };

  const inviteMember = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !activeOrg || inviting) return;
    setInviting(true);
    setActionError(null);
    setActionDone(null);
    try {
      const result = await authClient.organization.inviteMember({
        organizationId: activeOrg.id,
        email,
        role: inviteRole,
      });
      const failure = readError(result, "Could not send the invitation.");
      if (failure) {
        setActionError(failure);
        return;
      }
      setInviteEmail("");
      setActionDone(`Invitation sent to ${email}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not send the invitation.");
    } finally {
      setInviting(false);
    }
  };

  const cancelInvitation = async (invitationId) => {
    setActionError(null);
    try {
      const result = await authClient.organization.cancelInvitation({ invitationId });
      const failure = readError(result, "Could not cancel the invitation.");
      if (failure) setActionError(failure);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not cancel the invitation.");
    }
  };

  const answerInvitation = async (invitationId, accept) => {
    setBusyInvitation(invitationId);
    setActionError(null);
    try {
      const result = accept
        ? await authClient.organization.acceptInvitation({ invitationId })
        : await authClient.organization.rejectInvitation({ invitationId });
      const failure = readError(result, accept ? "Could not join." : "Could not decline.");
      if (failure) {
        setActionError(failure);
        return;
      }
      await refreshInbox();
      if (accept) {
        // Lands in the joined workspace at once; otherwise the user stays
        // personal and sees none of the new shared documents.
        const invite = inbox.find((item) => item.id === invitationId);
        const joinedOrgId = invite?.organizationId ?? invite?.organization?.id ?? null;
        if (joinedOrgId) {
          try {
            await authClient.organization.setActive({ organizationId: joinedOrgId });
          } catch {
            // Still joined; workspace refresh picks up membership.
          }
        }
        announceJoinToOrg();
        setOpen(false);
        afterWorkspaceChange();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusyInvitation(null);
    }
  };

  const leaveOrganization = async () => {
    if (!activeOrg) return;
    if (!leaveArmed) {
      setLeaveArmed(true);
      return;
    }
    setLeaving(true);
    setActionError(null);
    try {
      const result = await authClient.organization.leave({ organizationId: activeOrg.id });
      const failure = readError(result, "Could not leave the organization.");
      if (failure) {
        setActionError(failure);
        return;
      }
      // Drops back to personal; otherwise later calls still scope to the
      // departed organization and list nothing.
      try {
        await authClient.organization.setActive({ organizationId: null });
      } catch {
        // Left already; workspace refresh converges on personal scope.
      }
      setOpen(false);
      setLeaveArmed(false);
      afterWorkspaceChange();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not leave the organization.");
    } finally {
      setLeaving(false);
    }
  };

  // Personal workspace with no pending invitations: nothing to manage.
  if (!activeOrg && inbox.length === 0 && !inboxLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" title={activeOrg ? "People" : "Invitations"} />}
      >
        {activeOrg ? <Users /> : <Mail />}
        <span className="max-w-32 truncate">{activeOrg ? activeOrg.name : "Invites"}</span>
        <Badge variant="secondary" className="ml-0.5">
          {activeOrg ? members.length : inbox.length}
        </Badge>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {activeOrg ? (
          <DialogHeader>
            <div className="flex items-center gap-3">
              {activeOrg.logo ? (
                <Image
                  src={activeOrg.logo}
                  alt={`${activeOrg.name} logo`}
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-lg font-semibold text-background">
                  {initialOf(activeOrg.name)}
                </span>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate">{activeOrg.name}</DialogTitle>
                <DialogDescription>
                  Organization · {members.length} {members.length === 1 ? "person" : "people"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        ) : (
          <DialogHeader>
            <DialogTitle>Invitations</DialogTitle>
            <DialogDescription>Organizations you are invited to join.</DialogDescription>
          </DialogHeader>
        )}

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          {activeOrg && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">People ({members.length})</h3>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No member details available.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {members.map((member) => (
                    <li
                      key={member.id ?? member.userId}
                      className="flex items-center gap-2.5 rounded-md border border-border px-2 py-1.5"
                    >
                      <Avatar className="size-7">
                        {(member.user?.image ?? member.image) && (
                          <AvatarImage
                            src={member.user?.image ?? member.image}
                            alt={member.user?.name ?? member.user?.email ?? "Member"}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {initialOf(member.user?.name ?? member.user?.email ?? member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {member.user?.name ?? member.user?.email ?? member.email ?? "Member"}
                        </span>
                        {member.user?.email && (
                          <span className="truncate text-xs text-muted-foreground">
                            {member.user.email}
                          </span>
                        )}
                      </span>
                      <Badge variant="secondary">{member.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeOrg && (
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <UserPlus className="size-4" /> Invite people
              </h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    inputMode="email"
                    autoComplete="off"
                    className="min-w-0 flex-1"
                  />
                  <select
                    aria-label="Role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="h-8 shrink-0 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button
                  onClick={inviteMember}
                  disabled={!inviteEmail.trim() || inviting}
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {inviting ? "Sending…" : "Send invite"}
                </Button>
              </div>
              {sentInvites.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {sentInvites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-sm"
                    >
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {invite.email}
                        <span className="text-muted-foreground"> · {invite.role} · pending</span>
                      </span>
                      <button
                        onClick={() => cancelInvitation(invite.id)}
                        title={`Cancel invite to ${invite.email}`}
                        className="flex size-6 items-center justify-center rounded-md outline-none transition hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-4" /> Your invitations
              {inboxLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </h3>
            {inbox.length === 0 && !inboxLoading ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {inbox.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {invite.organizationName ?? invite.organization?.name ?? "Organization"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        Invited as {invite.role}
                      </span>
                    </span>
                    <Button
                      size="xs"
                      disabled={busyInvitation === invite.id}
                      onClick={() => answerInvitation(invite.id, true)}
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      <Check /> Join
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busyInvitation === invite.id}
                      onClick={() => answerInvitation(invite.id, false)}
                    >
                      Decline
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          {actionDone && <p className="text-sm text-muted-foreground">{actionDone}</p>}

          {activeOrg && (
            <section className="flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={leaveOrganization} disabled={leaving}>
                <LogOut />
                {leaving
                  ? "Leaving…"
                  : leaveArmed
                    ? "Click again to confirm leaving"
                    : "Leave organization"}
              </Button>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
