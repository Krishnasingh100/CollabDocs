"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";

function timeAgo(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function DocumentCard({
  id,
  title,
  updatedAt,
}: {
  id: string;
  title: string;
  updatedAt: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setDeleting(true);
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/document/${id}`}
      className="group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute right-3 top-3 rounded p-1.5 text-muted-foreground opacity-0 hover:bg-secondary hover:text-destructive group-hover:opacity-100"
        aria-label="Delete document"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="flex h-24 items-center justify-center rounded bg-secondary">
        <FileText className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="mt-3 truncate pr-6 text-sm font-medium text-foreground group-hover:text-primary">
        {title}
      </p>
      <p className="text-xs text-muted-foreground">Edited {timeAgo(updatedAt)}</p>
    </Link>
  );
}