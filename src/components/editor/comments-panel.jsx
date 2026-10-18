"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Composer, Thread } from "@liveblocks/react-ui";
import { isLiveblocksEnabled, useLiveThreads } from "./live-room";

// Document-level live comments powered by Liveblocks Threads.
// Takes open state, close handler and inRoom flag. Returns null when
// Liveblocks is disabled or when there is no room (personal documents never
// show live-comment UI). Inner always runs hooks unconditionally inside
// <LiveDocRoom>.
export function CommentsPanel({ open, onClose, inRoom = true }) {
  if (!open) return null;
  if (!isLiveblocksEnabled()) return null;
  if (!inRoom) return null;
  return <CommentsPanelInner onClose={onClose} />;
}

function CommentsPanelInner({ onClose }) {
  const [filter, setFilter] = useState("open");
  const query = filter === "all" ? {} : { resolved: filter === "resolved" };
  const { threads, isLoading, error } = useLiveThreads({ query });

  const list = threads ?? [];
  const openCount = filter === "open" ? list.length : null;

  return (
    <aside
      aria-label="Document comments"
      className="fixed top-[104px] right-4 bottom-16 z-40 flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">
          Comments{openCount !== null ? ` (${openCount})` : ""}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comments"
          className="ml-auto rounded-md p-1.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b px-3 py-2">
        {[
          { id: "open", label: "Open" },
          { id: "resolved", label: "Resolved" },
          { id: "all", label: "All" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            aria-pressed={filter === t.id}
            className={
              filter === t.id
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading comments…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">Comments failed to load.</p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {filter === "resolved"
              ? "No resolved comments yet."
              : filter === "all"
                ? "No comments yet. Start the discussion below."
                : "No open comments. Add one below."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((thread) => (
              <Thread key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">New document comment</p>
        <Composer showAttachments={false} showAttribution={false} />
      </div>
    </aside>
  );
}

// Takes open state plus toggle plus inRoom flag; renders header bell with the
// live open-thread count when inside a room. Returns null when Liveblocks is
// disabled or when not in a room (personal documents show no comment UI).
export function CommentsButton({ open, onToggle, inRoom = true }) {
  if (!isLiveblocksEnabled()) return null;
  if (!inRoom) return null;
  return <CommentsButtonLive open={open} onToggle={onToggle} />;
}

// Call only inside <LiveDocRoom>: hooks require room context.
function CommentsButtonLive({ open, onToggle }) {
  const { threads } = useLiveThreads({ query: { resolved: false } });
  return <CommentsButtonPlain open={open} onToggle={onToggle} count={threads?.length ?? 0} />;
}

// Renders the comment toggle button; optional open-thread count.
function CommentsButtonPlain({ open, onToggle, count }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      aria-label={open ? "Hide comments" : `Show comments${count ? `, ${count} open` : ""}`}
      title={count ? `${count} open comment${count === 1 ? "" : "s"}` : "Comments"}
      className={
        open
          ? "relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
          : "relative flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      <MessageSquare className="size-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
