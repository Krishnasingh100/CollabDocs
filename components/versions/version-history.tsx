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
import { History, RotateCcw, Save } from "lucide-react";

type Version = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
};

export function VersionHistory({
  documentId,
  onRestore,
}: {
  documentId: string;
  onRestore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function loadVersions() {
    const res = await fetch(`/api/versions?documentId=${documentId}`);
    if (res.ok) {
      const data = await res.json();
      setVersions(data.versions);
    }
  }

  useEffect(() => {
    if (open) loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  }, [open]);

  async function handleRestore(versionId: string) {
    setRestoring(versionId);
    const res = await fetch("/api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, restoreVersionId: versionId }),
    });
    setRestoring(null);

    if (res.ok) {
      setOpen(false);
      onRestore();
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function initials(name: string | null, email: string) {
    return (name ?? email).slice(0, 1).toUpperCase();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" nativeButton={false} />}
      >
        <History className="h-4 w-4" />
        History
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="font-heading">Version history</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Save className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 max-w-[220px] text-sm text-muted-foreground">
                No saved versions yet. They&apos;ll appear here as the document is edited.
              </p>
            </div>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">
                    {initials(v.name, v.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-none">
                    {v.name ?? v.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(v.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={restoring === v.id}
                  onClick={() => handleRestore(v.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {restoring === v.id ? "Restoring…" : "Restore"}
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}