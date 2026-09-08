"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Trash2, Send } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  name: string | null;
  email: string;
};

export function CommentsPanel({
  documentId,
  currentUserId,
}: {
  documentId: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadComments() {
    const res = await fetch(`/api/comments?documentId=${documentId}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, content: text.trim() }),
    });

    setLoading(false);
    if (res.ok) {
      setText("");
      loadComments();
    }
  }

  async function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
  }

  function timeAgo(date: string) {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function initials(name: string | null, email: string) {
    return (name ?? email).slice(0, 1).toUpperCase();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" nativeButton={false} />}
      >
        <MessageSquare className="h-4 w-4" />
        Comments
        {comments.length > 0 && (
          <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-xs">
            {comments.length}
          </span>
        )}
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-heading">Comments</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">
                No comments yet. Start the conversation.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">
                    {initials(c.name, c.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium leading-none">
                      {c.name ?? c.email}
                    </span>
                    {c.user_id === currentUserId && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    {c.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(c.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" size="icon" disabled={loading || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}