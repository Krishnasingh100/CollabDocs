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

// Takes a document id; provides the Liveblocks room plus the lazy editor.
// Returns the full editing view. Room auth is enforced server-side per doc.
export function DocumentView({ documentId }) {
  return (
    <LiveDocRoom documentId={documentId}>
      <DocumentEditor documentId={documentId} />
    </LiveDocRoom>
  );
}
