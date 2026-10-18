"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { InboxNotification, InboxNotificationList } from "@liveblocks/react-ui";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  isLiveblocksEnabled,
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useUnreadInboxNotificationsCount,
} from "@/components/editor/live-room";

// Room id and the org-notify sender live in a Liveblocks-free module so
// personal pages can import them without pulling the Liveblocks bundle.
export { dashRoomIdFor, sendOrgNotification } from "@/lib/org-notifications";

// Renders one "$orgDocumentCreated" notification with a doc link.
// Reads the document id from activity data so the click never needs room access.
function OrgDocumentNotification(props) {
  const data = props.inboxNotification.activities?.[0]?.data ?? {};
  const documentId = String(data.documentId ?? "");
  return (
    <InboxNotification.Custom
      {...props}
      title={String(data.orgName ?? "your organization")}
      markAsReadOnClick
      aside={<InboxNotification.Icon><Bell /></InboxNotification.Icon>}
    >
      <span>New document “{data.documentTitle ?? "Untitled"}” was created</span>
      {documentId && (
        <Link
          href={`/documents/${documentId}`}
          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open document
        </Link>
      )}
    </InboxNotification.Custom>
  );
}

// Renders one "$orgMemberJoined" notification.
function OrgMemberNotification(props) {
  const data = props.inboxNotification.activities?.[0]?.data ?? {};
  return (
    <InboxNotification.Custom
      {...props}
      title={data.memberName ? `${data.memberName} joined` : "Member joined"}
      markAsReadOnClick
      aside={<InboxNotification.Icon><Bell /></InboxNotification.Icon>}
    >
      <span>
        {data.memberName ? `${data.memberName} joined ` : "Someone joined "}
        <span className="font-medium">{data.orgName ?? "your organization"}</span>
      </span>
    </InboxNotification.Custom>
  );
}

// One row per inbox notification; kind map keeps thread default rendering and
// routes custom org kinds to the custom renderers above.
function NotificationRow({ notification }) {
  const href =
    notification.kind === "thread" ? `/documents/${notification.roomId}` : undefined;
  return (
    <InboxNotification
      inboxNotification={notification}
      href={href}
      kinds={{
        $orgDocumentCreated: OrgDocumentNotification,
        $orgMemberJoined: OrgMemberNotification,
      }}
    />
  );
}

// Lists the full inbox for the signed-in user. Returns list UI, never null.
// Takes the optional query filter so the editor panel can scope to its room.
function NotificationListPanel({ query }) {
  const { inboxNotifications, isLoading, error } = useInboxNotifications(query ? { query } : undefined);
  const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
  const list = inboxNotifications ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading notifications…
      </div>
    );
  }
  if (error) {
    return (
      <p className="py-8 text-center text-sm text-destructive">
        Notifications failed to load.
      </p>
    );
  }
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <BellOff className="size-5" />
        <span>No notifications yet</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={markAllInboxNotificationsAsRead}>
          <CheckCheck className="size-3.5" />
          Mark all as read
        </Button>
      </div>
      <InboxNotificationList className="m-0 flex flex-col gap-1">
        {list.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </InboxNotificationList>
    </div>
  );
}

// Bell button with unread badge plus the inbox panel. Must render inside a
// Liveblocks room context (editor document room or dashboard InboxRoomProvider).
// Takes optional query (roomId/kind filter). Returns null when Liveblocks is
// off or when inRoom=false (personal documents have no room by design).
export function NotificationBell({ query, inRoom = true }) {
  if (!isLiveblocksEnabled() || !inRoom) return null;
  return <NotificationBellInner query={query} />;
}

function NotificationBellInner({ query }) {
  const [open, setOpen] = useState(false);
  const { count } = useUnreadInboxNotificationsCount({ query });
  const listQuery = useMemo(
    () => (query && Object.keys(query).length > 0 ? { query } : undefined),
    [query],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            title={count > 0 ? `${count} unread notification${count === 1 ? "" : "s"}` : "Notifications"}
            className={cn("relative shrink-0", count > 0 && "bg-accent text-accent-foreground")}
          >
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto p-2">
        <p className="px-2 pb-2 text-sm font-semibold">Notifications</p>
        <NotificationListPanel query={listQuery} />
      </PopoverContent>
    </Popover>
  );
}
