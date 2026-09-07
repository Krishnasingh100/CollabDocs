import Link from "next/link";
import { FileText } from "lucide-react";

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
  return (
    <Link
      href={`/document/${id}`}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex h-24 items-center justify-center rounded bg-secondary">
        <FileText className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="mt-3 truncate text-sm font-medium text-foreground group-hover:text-primary">
        {title}
      </p>
      <p className="text-xs text-muted-foreground">Edited {timeAgo(updatedAt)}</p>
    </Link>
  );
}