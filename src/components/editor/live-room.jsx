"use client";
import { memo, createContext, useCallback, useContext, useEffect } from "react";
import { createClient } from "@liveblocks/client";
import { ClientSideSuspense, createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { authClient } from "@/lib/auth/client";

// --- Live Yjs collaboration -------------------------------------------------
// One provider (and its Y.Doc) per document room; the Yjs content is persisted
// inside the Liveblocks room itself, so every open editor sees live updates.
// Providers are cached in this module so remounts reuse the connection; they
// are disconnected (not destroyed) on unmount to keep the doc state warm.
const yjsProviders = new Map();
const LiveYjsContext = createContext(null);
// Returns the room's collaboration context ({ ydoc, provider }) or null.
// Must be called inside <LiveDocRoom> (or any room) when enabled.
export function useLiveYjs() {
  return useContext(LiveYjsContext);
}
// Host rendered inside the room: wires the Liveblocks yjs provider and pushes
// the context to children once the room connection object exists.
// The provider comes from the module cache keyed by room id, so deriving it
// during render is idempotent (StrictMode double-render dedupes).
function LiveYjsHost({ children }) {
  const room = useRoomHook();
  let value = null;
  if (room) {
    let provider = yjsProviders.get(room.id) ?? null;
    if (!provider) {
      try {
        provider = getYjsProviderForRoom(room);
        yjsProviders.set(room.id, provider);
      } catch {
        provider = null;
      }
    }
    if (provider) value = { ydoc: provider.getYDoc(), provider };
  }
  // Cleanup echo: disconnect the room socket when the room unmounts; the
  // cached provider stays reusable for a later remount.
  useEffect(() => {
    if (!room) return;
    const provider = yjsProviders.get(room.id) ?? null;
    return () => {
      try {
        provider?.disconnect();
      } catch {
        // socket already closing
      }
    };
  }, [room]);
  return <LiveYjsContext.Provider value={value}>{children}</LiveYjsContext.Provider>;
}

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
let useRoomHook = null;
let useOthersHook = null;
let useMyPresenceHook = null;
let useStatusHook = null;
let useThreadsHook = null;
let useInboxNotificationsHook = null;
let useUnreadInboxNotificationsCountHook = null;
let useMarkAllInboxNotificationsAsReadHook = null;
if (liveblocksEnabled) {
  // @mention autocomplete: lists the active organization's members, cached for
  // 60 s so keystrokes do not re-fetch the org directory. Personal workspaces
  // have no directory and resolve nothing. Only ids are returned; display
  // names/avatars come from resolveUsers.
  let mentionCache = { at: 0, people: [] };
  async function loadMentionPeople() {
    const now = Date.now();
    if (now - mentionCache.at < 60_000 && mentionCache.people) return mentionCache.people;
    const [{ data: session }, { data: org }] = await Promise.all([
      authClient.getSession(),
      authClient.organization.getFullOrganization(),
    ]);
    const selfId = String(session?.user?.id ?? "");
    const members = Array.isArray(org?.members) ? org.members : [];
    const people = members
      .map((m) => ({
        id: String(m?.userId ?? m?.user?.id ?? ""),
        label: `${m?.user?.name ?? m?.name ?? ""} ${m?.user?.email ?? m?.email ?? ""}`.toLowerCase(),
      }))
      .filter((p) => p.id && p.id !== selfId);
    mentionCache = { at: now, people };
    return people;
  }

  // Takes Liveblocks args { roomId, text }; returns matching member user ids.
  // Returns [] on any error so the composer keeps working without mentions.
  async function resolveMentionSuggestions({ text }) {
    try {
      const needle = String(text ?? "").toLowerCase();
      const people = await loadMentionPeople();
      if (!needle) return people.map((p) => p.id);
      return people.filter((p) => p.label.includes(needle)).map((p) => p.id);
    } catch {
      return [];
    }
  }

  // Singleton client: authEndpoint mints a per-document token (see
  // /api/liveblocks-auth), resolveUsers gives every connection a display
  // name/avatar. This authenticated traffic is what clears the Liveblocks
  // dashboard "set up authentication" warning.
  const client = createClient({
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
    resolveMentionSuggestions,
  });
  const room = createRoomContext(client);
  // Inbox/notification hooks moved to createLiveblocksContext in
  // @liveblocks/react v3 — createRoomContext no longer returns them. Reading
  // them from the room context left the variables undefined and crashed the
  // dashboard bell with "ef is not a function" on every page load.
  const liveblocks = createLiveblocksContext(client);
  RoomProvider = room.RoomProvider;
  ClientSuspense = ClientSideSuspense;
  useRoomHook = room.useRoom;
  useOthersHook = room.useOthers;
  useMyPresenceHook = room.useMyPresence;
  useStatusHook = room.useStatus;
  useThreadsHook = room.useThreads;
  useInboxNotificationsHook = liveblocks.useInboxNotifications;
  useUnreadInboxNotificationsCountHook = liveblocks.useUnreadInboxNotificationsCount;
  useMarkAllInboxNotificationsAsReadHook = liveblocks.useMarkAllInboxNotificationsAsRead;
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
        <ClientSuspense fallback={<>{children}</>}>
          {() => <LiveYjsHost>{inner}</LiveYjsHost>}
        </ClientSuspense>
      ) : (
        <>{inner}</>
      )}
    </RoomProvider>
  );
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
            status === "connected"
              ? "size-2 rounded-full bg-emerald-500"
              : "size-2 rounded-full bg-amber-500"
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

// Takes optional inRoom flag; shows who else views this document. Returns
// avatar stack UI. Renders a live dot when alone, nothing extra when
// Liveblocks is disabled. Personal documents pass inRoom=false (no room, no
// hooks, no crash and no presence leak).
export function PresenceAvatars({ inRoom = true }) {
  if (!inRoom || !useOthersHook) return null;
  return <PresenceAvatarsInner />;
}

// No input; reports whether Liveblocks presence/comments are active. Returns bool.
export function isLiveblocksEnabled() {
  return liveblocksEnabled;
}

// Raw room threads hook. Call only inside <LiveDocRoom> when enabled.
// Split outer (gates on isLiveblocksEnabled) / inner (calls hook) keeps hooks unconditional.
// Falls back to an empty result so a missing Liveblocks hook can never crash
// a page again (the flag is fixed per build, so hook order stays stable).
export function useLiveThreads(options) {
  if (!useThreadsHook) return { threads: [], isLoading: false, error: null };
  return useThreadsHook(options);
}

// Raw inbox hooks. Call only inside a room context (document editor or
// <InboxRoomProvider>) when enabled; guarded outer versions skip API errors.
// Each falls back to inert values when the underlying hook is unavailable.
export function useInboxNotifications(options) {
  if (!useInboxNotificationsHook) {
    return { inboxNotifications: [], isLoading: false, error: null };
  }
  return useInboxNotificationsHook(options);
}
export function useUnreadInboxNotificationsCount(options) {
  if (!useUnreadInboxNotificationsCountHook) return { count: 0, isLoading: false };
  return useUnreadInboxNotificationsCountHook(options);
}
export function useMarkAllInboxNotificationsAsRead() {
  if (!useMarkAllInboxNotificationsAsReadHook) return () => {};
  return useMarkAllInboxNotificationsAsReadHook();
}

// In-room wrapper for the per-user dash board: connects to one pseudo room so
// inbox hooks have a room context outside the document editor. Dashboard only.
// Takes room id plus children; returns provider UI; null children pass-through
// when Liveblocks is disabled.
export function InboxRoomProvider({ roomId, children }) {
  if (!liveblocksEnabled || !RoomProvider || !roomId) return <>{children}</>;
  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
      {children}
    </RoomProvider>
  );
}
