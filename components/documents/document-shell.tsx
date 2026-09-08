"use client";

import { useRef } from "react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { CommentsPanel } from "@/components/comments/comments-panel";
import { VersionHistory } from "@/components/versions/version-history";
import { Room } from "@/components/collaboration/room";
import { PresenceAvatars } from "@/components/collaboration/presence-avatars";

export function DocumentShell({
  documentId,
  title,
  initialContent,
  role,
  currentUserId,
}: {
  documentId: string;
  title: string;
  initialContent: string;
  role: string | null;
  currentUserId: string;
}) {
  const editorRef = useRef<{ reloadContent: (content: string) => void }>(null);

  async function handleRestore() {
    const res = await fetch(`/api/documents/${documentId}`);
    if (res.ok) {
      const data = await res.json();
      editorRef.current?.reloadContent(data.document.content ?? "");
    }
  }

  return (
    <Room documentId={documentId}>
      <div className="flex h-screen flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="font-heading text-base font-medium">{title}</h1>
          <div className="flex items-center gap-3">
            <PresenceAvatars />
            <VersionHistory documentId={documentId} onRestore={handleRestore} />
            <CommentsPanel documentId={documentId} currentUserId={currentUserId} />
            {role === "owner" && <ShareDialog documentId={documentId} />}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <TiptapEditor ref={editorRef} documentId={documentId} initialContent={initialContent} />
        </div>
      </div>
    </Room>
  );
}