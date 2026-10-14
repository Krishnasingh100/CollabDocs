"use client";
import { memo, useCallback, useEffect } from "react";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Sanitizes the public key: trims whitespace plus pasted quotes. Returns clean text.
function cleanKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

const publicApiKey = cleanKey(process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY);
// Creates the client only with a real publishable key. A missing or pasted
// secret key used to throw during module evaluation and break every
// document page. Disabled state keeps the editor fully usable offline.
const liveblocksEnabled = publicApiKey.startsWith("pk_");

let RoomProvider = null;
let ClientSuspense = null;
let useOthersHook = null;
let useMyPresenceHook = null;
let useStatusHook = null;
if (liveblocksEnabled) {
  // Singleton client: authEndpoint mints a per-document token (see
  // /api/liveblocks-auth), resolveUsers gives every connection a display
  // name/avatar. This authenticated traffic is what clears the Liveblocks
  // dashboard "set up authentication" warning.
  const client = createClient({
    publicApiKey,
    throttle: 100,
    authEndpoint: "/api/liveblocks-auth",
    resolveUsers: async ({ userIds }) => {
      try {
        const res = await fetch("/api/liveblocks-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });
        if (!res.ok) throw new Error("users failed");
        const { data } = await res.json();
        return Array.isArray(data) ? data : userIds.map(() => ({}));
      } catch {
        return userIds.map(() => ({}));
      }
    },
  });
  const room = createRoomContext(client);
  RoomProvider = room.RoomProvider;
  ClientSuspense = room.ClientSideSuspense;
  useOthersHook = room.useOthers;
  useMyPresenceHook = room.useMyPresence;
  useStatusHook = room.useStatus;
} else if (typeof window !== "undefined") {
  console.warn(
    "[liveblocks] Disabled: set NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY to a pk_ key. Presence stays off; editing works.",
  );
}

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

// Tracks the local pointer and broadcasts it as presence (throttled by the
// client). Clearing on leave keeps remote cursors from sticking around.
function PresenceTracker() {
  const [, updateMyPresence] = useMyPresenceHook();
  const onMove = useCallback(
    (e) => {
      updateMyPresence({ cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) } });
    },
    [updateMyPresence],
  );
  const onLeave = useCallback(() => updateMyPresence({ cursor: null }), [updateMyPresence]);
  useEffect(() => {
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("blur", onLeave);
    };
  }, [onMove, onLeave]);
  return null;
}

// Renders one remote cursor with a name flag. Fixed overlay, never intercepts.
const RemoteCursor = memo(function RemoteCursor({ x, y, name, color }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-50 flex items-start"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M4 2.5 13.5 9.2 8.6 10.1 6.9 14.9 4 2.5Z"
          fill={color}
          stroke="white"
          strokeWidth="1.2"
        />
      </svg>
      <span
        className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-white shadow"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </span>
  );
});

// Renders every remote cursor in this room. Returns null when alone/offline.
function LiveCursorsInner() {
  const others = useOthersHook();
  if (!others || others.length === 0) return null;
  return (
    <>
      {others.map((other) => {
        const cursor = other.presence?.cursor;
        if (!cursor || typeof cursor.x !== "number") return null;
        return (
          <RemoteCursor
            key={other.connectionId}
            x={cursor.x}
            y={cursor.y}
            name={String(other.info?.name ?? "Someone")}
            color={colorFor(other.connectionId)}
          />
        );
      })}
    </>
  );
}

export function LiveCursors() {
  if (!useOthersHook) return null;
  return <LiveCursorsInner />;
}

// Takes document id plus children; scopes presence to one document room. Returns provider UI.
// Passes children through untouched when Liveblocks is disabled.
export function LiveDocRoom({ documentId, children }) {
  if (!RoomProvider) return <>{children}</>;
  const inner = (
    <>
      <PresenceTracker />
      <LiveCursors />
      {children}
    </>
  );
  return (
    <RoomProvider id={documentId} initialPresence={{ cursor: null }}>
      {ClientSuspense ? (
        <ClientSuspense fallback={<>{children}</>}>{() => inner}</ClientSuspense>
      ) : (
        <>{inner}</>
      )}
    </RoomProvider>
  );
}

// Takes document id, org id, plus children; scopes presence to org documents.
// Returns the room provider for shared workspaces, plain children otherwise.
// Personal documents never touch Liveblocks: no usage burned, no presence leaked.
export function OrgDocRoom({ documentId, orgId, children }) {
  if (!orgId) return <>{children}</>;
  return <LiveDocRoom documentId={documentId}>{children}</LiveDocRoom>;
}
// Takes no props; shows who else views this document. Returns avatar stack UI.
function PresenceAvatarsInner() {
  const others = useOthersHook();
  const status = useStatusHook ? useStatusHook() : "connected";
  if (!others || others.length === 0) {
    return (
      <span
        title={status === "connected" ? "Live — no one else here" : `Presence ${status}`}
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span
          className={
            status === "connected" ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"
          }
        />
        <span className="hidden sm:inline">Live</span>
      </span>
    );
  }
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

// Takes no props; shows who else views this document. Returns avatar stack UI.
// Renders a live dot when alone, nothing extra when Liveblocks is disabled.
export function PresenceAvatars() {
  if (!useOthersHook) return null;
  return <PresenceAvatarsInner />;
}
