"use client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ?? "";

// Presence-only client for now: proves the Liveblocks connection per document.
// Yjs document sync lands on top of this same room next.
const client = createClient({
  publicApiKey,
  throttle: 100,
});

const { RoomProvider, useOthers } = createRoomContext(client);

const AVATAR_COLORS = ["#1a73e8", "#0b8043", "#d97706", "#7c3aed", "#dc2626", "#0d9488"];

// Takes a connection id; picks a stable avatar color. Returns hex color.
function colorFor(connectionId) {
  return AVATAR_COLORS[Number(connectionId ?? 0) % AVATAR_COLORS.length];
}

// Takes Liveblocks user info; returns display initials. Returns short text.
function initialsOf(info) {
  const name = String(info?.name ?? "").trim();
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Takes document id plus children; scopes presence to one document room. Returns provider UI.
export function LiveDocRoom({ documentId, children }) {
  return (
    <RoomProvider
      id={documentId}
      initialPresence={{ cursor: null }}
      authEndpoint="/api/liveblocks-auth"
    >
      {children}
    </RoomProvider>
  );
}

// Takes no props; shows who else views this document. Returns avatar stack UI.
// Renders nothing when alone so the header stays clean until someone joins.
export function PresenceAvatars() {
  const others = useOthers();
  if (!others || others.length === 0) return null;
  const shown = others.slice(0, 5);
  const extra = others.length - shown.length;
  return (
    <span
      className="flex shrink-0 items-center"
      title={`${others.length} other${others.length === 1 ? "" : "s"} viewing`}
    >
      {shown.map((other) => (
        <span
          key={other.connectionId}
          title={String(other.info?.name ?? "Someone")}
          className="-ml-1.5 flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white first:ml-0"
          style={{ backgroundColor: colorFor(other.connectionId) }}
        >
          {initialsOf(other.info)}
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-white">
          +{extra}
        </span>
      )}
    </span>
  );
}
