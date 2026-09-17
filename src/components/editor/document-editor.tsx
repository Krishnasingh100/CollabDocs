"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  getLocalDocument,
  saveLocalDocument,
  type DocumentDetail,
  type TipTapDoc,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./editor-toolbar";
import { DEFAULT_MARGIN, MarginRuler } from "./margin-ruler";
import { getEditorExtensions } from "./extensions";
import "./editor.css";

type SaveState = "saved" | "saving" | "offline";

// Fixed page height in px. 1056px = 11in Letter height at 96dpi.
// Editor starts as exactly one page, grows without limit.
// Break markers render at each multiple, content flows onto next page.
const PAGE_HEIGHT = 1056;

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [title, setTitle] = useState("Untitled document");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [margins, setMargins] = useState({ left: DEFAULT_MARGIN, right: DEFAULT_MARGIN });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const recalcPages = useCallback(() => {
    const el = canvasRef.current?.querySelector(".tiptap") as HTMLElement | null;
    const h = el?.scrollHeight ?? PAGE_HEIGHT;
    setPageCount(Math.max(1, Math.ceil(h / PAGE_HEIGHT)));
  }, []);

  // Side margins controlled by the ruler, persisted per document locally.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`collabdocs:margins:${documentId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { left?: number; right?: number };
        if (typeof parsed.left === "number" && typeof parsed.right === "number") {
          setMargins({
            left: Math.min(Math.max(0, Math.round(parsed.left)), 300),
            right: Math.min(Math.max(0, Math.round(parsed.right)), 300),
          });
        }
      }
    } catch {
      // ignore corrupt storage, keep defaults
    }
  }, [documentId]);

  useEffect(() => {
    try {
      localStorage.setItem(`collabdocs:margins:${documentId}`, JSON.stringify(margins));
    } catch {
      // storage unavailable, margins stay in memory
    }
  }, [documentId, margins]);

  const editor = useEditor(
    {
      extensions: getEditorExtensions(),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "docs-page-editor",
          role: "textbox",
          "aria-label": "Document body. Click and type.",
        },
      },
      onUpdate: ({ editor }) => {
        const json = editor.getJSON() as TipTapDoc;
        const text = editor.getText();
        setWordCount(editor.storage.characterCount?.words?.() ?? 0);
        setSaveState("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void persist(json, text), 900);
        requestAnimationFrame(() => recalcPages());
      },
    },
    [],
  );

  const persist = useCallback(
    async (json: TipTapDoc, text: string) => {
      const now = new Date().toISOString();
      const existing = getLocalDocument(documentId);
      saveLocalDocument({
        id: documentId,
        title,
        content: json,
        plainText: text.slice(0, 20000),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: json,
            plainText: text.slice(0, 20000),
            title,
          }),
        });
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        setSaveState("saved");
      } catch {
        setSaveState("offline");
      }
    },
    [documentId, title],
  );

  // Load once: API first, localStorage fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let content: TipTapDoc | null = null;
      let docTitle = "Untitled document";
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { document: DocumentDetail };
          if (data.document) {
            docTitle = data.document.title || docTitle;
            content = (data.document.content as TipTapDoc | null) ?? null;
          }
        } else {
          throw new Error("api miss");
        }
      } catch {
        const local = getLocalDocument(documentId);
        if (local) {
          docTitle = local.title;
          content = local.content;
        }
      }
      if (!cancelled) {
        setTitle(docTitle);
        if (content && editor) editor.commands.setContent(content);
        setLoaded(true);
        if (editor) {
          setWordCount(editor.storage.characterCount?.words?.() ?? 0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, []);

  // Recalc total pages on load, resize, and content growth.
  // Track current page from window scroll position over canvas.
  useEffect(() => {
    recalcPages();
    const onResize = () => recalcPages();
    const onScroll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pastTop = Math.max(0, -rect.top + 96);
      setCurrentPage(
        Math.min(
          pageCount,
          Math.max(1, Math.floor(pastTop / PAGE_HEIGHT) + 1),
        ),
      );
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(recalcPages, 300);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, [loaded, pageCount, recalcPages]);

  const saveTitle = useCallback(
    (next: string) => {
      setTitle(next);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        const now = new Date().toISOString();
        const existing = getLocalDocument(documentId);
        saveLocalDocument({
          id: documentId,
          title: next || "Untitled document",
          content: (editor?.getJSON() ?? null) as TipTapDoc | null,
          plainText: editor?.getText() ?? existing?.plainText ?? "",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: next || "Untitled document" }),
          });
          setSaveState("saved");
        } catch {
          setSaveState("offline");
        }
      }, 700);
    },
    [documentId, editor],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fa]">
      {/* Slim header: toggle + title + save state, one line */}
      <header className="sticky top-0 z-40 border-b border-[#dadce0] bg-white">
        <div className="flex h-12 items-center gap-2 px-3">
          <SidebarTrigger className="shrink-0" />
          <Separator orientation="vertical" className="h-6 shrink-0" />
          <input
            value={title}
            onChange={(e) => saveTitle(e.target.value)}
            aria-label="Document title"
            placeholder="Untitled document"
            className="w-48 shrink-0 truncate rounded px-2 py-1 text-sm font-medium outline-none hover:bg-muted focus:bg-muted sm:w-64"
          />
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Saving…
              </>
            ) : saveState === "offline" ? (
              <>
                <CloudOff className="size-3" /> Saved locally
              </>
            ) : (
              <>
                <Check className="size-3" /> Saved
              </>
            )}
          </span>
        </div>
      </header>

      <EditorToolbar editor={editor} />

      {/* Gray background, white pages with clean visible border.
          Max width 816px fixed. Height starts one page, grows infinitely.
          Break markers show overflow flowing onto next page.
          Ruler above page controls side margins live. */}
      <main className="flex flex-1 flex-col items-center bg-[#f8f9fa] px-4 py-6">
        <div className="w-full max-w-[816px]">
          <MarginRuler left={margins.left} right={margins.right} onChange={setMargins} />
        </div>
        <div
          ref={canvasRef}
          onClick={() => editor?.chain().focus().run()}
          style={
            {
              "--docs-margin-left": `${margins.left}px`,
              "--docs-margin-right": `${margins.right}px`,
            } as CSSProperties
          }
          className="docs-canvas w-full max-w-[816px] cursor-text border border-[#dadce0] bg-white text-black shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_rgba(60,64,67,0.15)] sm:rounded-t-none"
        >
          {!loaded || !editor ? (
            <div className="flex min-h-[1056px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading document…
            </div>
          ) : (
            <>
              <EditorContent editor={editor} className="docs-editor-wrap" />
              {Array.from({ length: Math.max(0, pageCount - 1) }).map(
                (_, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    className="docs-page-break"
                    style={{ top: (i + 1) * PAGE_HEIGHT }}
                  >
                    <span>
                      Page {i + 1} of {pageCount}
                    </span>
                  </div>
                ),
              )}
            </>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-[#dadce0] bg-white">
        <div className="flex h-9 items-center gap-3 px-4 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <Separator orientation="vertical" className="h-4" />
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className={cn(saveState === "offline" && "text-amber-600")}>
            {saveState === "saving"
              ? "Saving…"
              : saveState === "offline"
                ? "Offline — local copy"
                : "All changes saved"}
          </span>
        </div>
      </footer>
    </div>
  );
}
