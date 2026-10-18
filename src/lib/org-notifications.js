// Shared, dependency-light helpers for organization notifications. Kept out
// of the Liveblocks component modules on purpose: importing this file never
// pulls the Liveblocks client bundle, so personal pages stay light.
const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ?? "";
const liveblocksEnabled = publicKey.startsWith("pk_");

// Room ids keep alphanumeric plus -/_; anything else collapses to a dash so
// the browser room id and the server-side auth check stay identical.
// Must mirror dashRoomIdFor() in src/app/api/liveblocks-auth/route.js.
export function dashRoomIdFor(userId) {
  const stem = String(userId ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60);
  return stem ? `dash-${stem}` : "";
}

// Server endpoint name reused for org events, kept in one place.
export const ORG_NOTIFY_ENDPOINT = "/api/notifications/org";

// Takes org id, kind, actor info, and targets; posts one org notification.
// Best-effort: callers fire and forget; failures never break the action.
export async function sendOrgNotification(payload) {
  if (!liveblocksEnabled) return;
  try {
    await fetch(ORG_NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Notifications are best-effort; the action itself already succeeded.
  }
}
