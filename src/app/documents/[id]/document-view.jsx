"use client";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { LiveDocRoom } from "@/components/editor/live-room";

// Heavy paginated editor loads only on the client so the page shell paints
// fast. Skeleton keeps layout stable while TipTap + Liveblocks connect.
const DocumentEditor = nextDynamic(
  () => import("@/components/editor/document-editor").then((m) => m.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen flex-col bg-[#f8f9fa]">
        <div className="h-20 border-b border-[#dadce0] bg-white" />
        <div className="flex flex-1 items-start justify-center px-4 py-6">
          <div className="flex min-h-[1056px] w-full max-w-[816px] items-center justify-center gap-2 bg-white text-sm text-muted-foreground shadow">
            <Loader2 className="size-4 animate-spin" /> Loading document…
          </div>
        </div>
      </div>
    ),
  },
);

// Takes a document id plus its org id (null for personal documents); scopes
// live collaboration. Returns the full editing view.
// Privacy: personal documents never enter a Liveblocks room — no Yjs, no
// presence, no shared content on third-party servers; they sync through the
// owner's own /api/documents endpoints only. Shared org documents connect to
// the room for real-time collaboration; room auth is enforced server-side.
export function DocumentView({ documentId, orgId = null }) {
  const editor = <DocumentEditor documentId={documentId} orgId={orgId} />;
  if (!orgId) return editor;
  return <LiveDocRoom documentId={documentId}>{editor}</LiveDocRoom>;
}
