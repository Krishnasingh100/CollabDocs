"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { getEditorExtensions } from "@/components/editor/extensions";
import { cn } from "@/lib/utils";

// Anonymous visitor page for a public view-only document link.
// Loads by token, renders TipTap content read-only, never saves anywhere.
export default function PublicDocPage() {
  const params = useParams();
  const token = params?.token ?? "";
  const [state, setState] = useState({ loading: true, error: null, doc: null });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ loading: false, error: "This link is no longer active.", doc: null });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/public/docs/${token}`, { cache: "no-store" });
        if (!res.ok) {
          setState({ loading: false, error: "This link is no longer active.", doc: null });
          return;
        }
        const data = await res.json();
        if (!cancelled) setState({ loading: false, error: null, doc: data.document ?? null });
      } catch {
        if (!cancelled) setState({ loading: false, error: "Could not load the shared document.", doc: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: state.doc?.content ?? { type: "doc", content: [] },
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "docs-page-editor",
        "aria-label": "Shared document (read-only)",
      },
    },
    onUpdate: ({ editor: ed }) => ed.setEditable(false),
  });

  useEffect(() => {
    if (editor && state.doc && !editor.isDestroyed) {
      try {
        editor.commands.setContent(state.doc.content ?? { type: "doc", content: [] });
      } catch {
        // ignore a malformed saved payload
      }
    }
  }, [editor, state.doc]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center gap-6 bg-background px-4 py-8">
      <div className="flex w-full max-w-4xl items-center gap-2">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden text-lg sm:inline">CollabDocs</span>
        </Link>
        <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Shared · read-only
        </span>
      </div>
      {state.loading ? (
        <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading shared document…
        </div>
      ) : state.error || !state.doc ? (
        <p role="alert" className="mt-24 text-sm text-destructive">
          {state.error ?? "Document unavailable."}
        </p>
      ) : (
        <div
          className={cn(
            "docs-sheet w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card shadow-sm",
          )}
        >
          <div className="border-b border-border px-6 py-3">
            <h1 className="truncate text-lg font-semibold">{state.doc.title}</h1>
            {state.doc.updatedAt && (
              <p className="text-xs text-muted-foreground">Updated {new Date(state.doc.updatedAt).toLocaleString()}</p>
            )}
          </div>
          <div className="px-6 py-6">
            <EditorContent editor={editor} className="docs-page-wrap" />
          </div>
        </div>
      )}
    </div>
  );
}
