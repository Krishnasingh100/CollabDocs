"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getLocalDocument, saveLocalDocument } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./editor-toolbar";
import { DEFAULT_MARGIN, MarginRuler } from "./margin-ruler";
import { DocumentMenubar } from "./document-menubar";
import { AccountMenu } from "@/components/auth/account-menu";
import { getEditorExtensions } from "./extensions";
import "./editor.css";
// Fixed page height in px. 1056px = 11in Letter height at 96dpi.
// Pages stack as separate sheets with a gray gap. Blocks that cross
// a page boundary get pushed to the next sheet, so text never has
// a cut line through it. New sheets appear as content grows.
const PAGE_HEIGHT = 1056;
const PAGE_GAP = 24;
export function DocumentEditor({ documentId }) {
  const [title, setTitle] = useState("Untitled document");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [margins, setMargins] = useState({ left: DEFAULT_MARGIN, right: DEFAULT_MARGIN });
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const titleRef = useRef(null);
  const canvasRef = useRef(null);
  const paginateTimer = useRef(null);
  const caretTimer = useRef(null);
  const editorRef = useRef(null);
  // Split overflowing paragraph text at a page boundary so content (and the
  // caret) flows onto the next sheet. Whole-block pushing alone fails once a
  // paragraph fills its page and keeps growing: the tail renders across the
  // gray gap and the caret looks stuck on the previous page. Returns true
  // when a split was dispatched — the resulting update re-runs pagination,
  // which then aligns the new block with margin-top.
  const splitAtPageBoundary = useCallback((stackRect, boundaryStackY, topKid, blockH, contentH) => {
    const editor = editorRef.current;
    const view = editor?.view;
    if (!view || editor.isDestroyed || !view.editable || view.composing) return false;
    const { state } = view;
    const boundaryTop = stackRect.top + boundaryStackY;
    // coordsAtPos works whether or not the boundary is scrolled into view
    // (posAtCoords does not — it is viewport-bound), so measuring uses
    // viewport coordinates on both sides of every comparison.
    const topAt = (pos) => {
      try {
        return view.coordsAtPos(pos).top;
      } catch {
        return null;
      }
    };
    // Only split plain paragraph or heading text — never code, tables, or
    // images. Those keep the whole-block push from the margin pass below.
    // (A giant heading taller than a page would otherwise slice across the
    // gap, so headings split like paragraphs; short ones are protected by
    // the widow/orphan guard below and still push whole.)
    const isSplittable = ($p) => {
      if ($p.parent.type.name !== "paragraph" && $p.parent.type.name !== "heading") return false;
      for (let d = 1; d <= $p.depth; d++) {
        const name = $p.node(d)?.type.name;
        if (
          name === "table" ||
          name === "table_row" ||
          name === "table_cell" ||
          name === "table_header"
        ) {
          return false;
        }
      }
      return true;
    };
    const topDomOf = ($p) => {
      try {
        return view.nodeDOM($p.start(1) - 1);
      } catch {
        return null;
      }
    };
    let sp = null;
    let blockStart = 0;
    let blockEnd = 0;
    let depth = 1;
    // Fast path: hit-test the point just below the boundary, then snap back
    // to that line's start.
    try {
      const found = view.posAtCoords({
        left: stackRect.left + stackRect.width / 2,
        top: boundaryTop + 2,
      });
      if (found) {
        const $pos = state.doc.resolve(found.pos);
        if (topDomOf($pos) === topKid && isSplittable($pos)) {
          const lineTop = topAt($pos.pos);
          if (lineTop != null) {
            let p = $pos.pos;
            let guard = 0;
            while (guard++ < 800) {
              if (p - 1 < $pos.start()) break;
              const prevTop = topAt(p - 1);
              if (prevTop == null || prevTop !== lineTop) break;
              p -= 1;
            }
            if (p > $pos.start()) {
              sp = p;
              blockStart = $pos.start();
              blockEnd = $pos.end();
              depth = $pos.depth;
            }
          }
        }
      }
    } catch {
      sp = null;
    }
    // Fallback when the boundary is offscreen (posAtCoords is null there):
    // binary-search a direct paragraph/heading block for the first line
    // below the boundary. Tops grow monotonically with position inside one
    // textblock, so this needs no visible hit-test.
    if (sp == null) {
      const tag = topKid.tagName;
      if (tag !== "P" && !/^H[1-6]$/.test(tag)) return false;
      let $b;
      try {
        $b = state.doc.resolve(view.posAtDOM(topKid, 0));
      } catch {
        return false;
      }
      if (topDomOf($b) !== topKid || !isSplittable($b)) return false;
      const start = $b.start();
      const end = $b.end();
      const firstTop = topAt(start);
      const lastTop = topAt(end);
      if (firstTop == null || lastTop == null) return false;
      if (lastTop < boundaryTop - 2 || firstTop >= boundaryTop - 2) return false;
      let lo = start;
      let hi = end;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const t = topAt(mid);
        if (t == null) {
          hi = mid - 1;
          continue;
        }
        if (t < boundaryTop - 2) lo = mid;
        else hi = mid - 1;
      }
      const loTop = topAt(lo);
      if (loTop == null) return false;
      let p = lo;
      let guard = 0;
      let moved = false;
      while (guard++ < 800) {
        if (p + 1 > end) return false;
        const t = topAt(p + 1);
        if (t == null) return false;
        p += 1;
        moved = true;
        if (t !== loTop) break;
      }
      if (!moved) return false;
      sp = p;
      blockStart = start;
      blockEnd = end;
      depth = $b.depth;
    }
    if (sp <= blockStart || sp >= blockEnd) return false;
    // Word-style break: fill the page down to its last line, then move only
    // the overflowing lines to the next sheet. A short block keeps at least
    // two lines on each side — a single line would orphan, so one extra line
    // moves down with it instead of pushing the whole block (which would
    // leave blank lines at the bottom of this page). Only when the block
    // starts within one line above the boundary, or is too short to split
    // 2/2, does the margin pass push it whole to the next sheet. A block
    // taller than a page can never push whole, so it splits with at least
    // one line on each side (already ensured above) instead of bleeding
    // into the gap.
    if (blockH <= contentH) {
      const lineTop = topAt(sp);
      if (lineTop == null) return false;
      let below = 1;
      let top = lineTop;
      let q = sp;
      let guard = 0;
      while (guard++ < 1200) {
        if (q + 1 > blockEnd) break;
        const t = topAt(q + 1);
        if (t == null) break;
        if (t !== top) {
          below += 1;
          top = t;
          if (below >= 2) break;
        }
        q += 1;
      }
      let above = 1;
      const startTop = topAt(blockStart);
      if (startTop == null) return false;
      top = startTop;
      q = blockStart;
      guard = 0;
      while (q < sp && guard++ < 2000) {
        q += 1;
        const t = topAt(Math.min(q, blockEnd));
        if (t == null) break;
        if (t !== top) {
          above += 1;
          top = t;
          if (above >= 2) break;
        }
      }
      if (above < 2) return false;
      if (below < 2) {
        // Single orphan line below: step the split back one full line so two
        // lines move down and this page stays filled to its last line.
        const prevTop = topAt(sp - 1);
        if (prevTop == null) return false;
        let back = sp - 1;
        guard = 0;
        while (guard++ < 800) {
          if (back - 1 < blockStart) break;
          const t = topAt(back - 1);
          if (t == null || t !== prevTop) break;
          back -= 1;
        }
        if (back <= blockStart) return false;
        sp = back;
      }
    }
    // Dispatch without touching the selection: ProseMirror maps the caret
    // through the split, so typing continues on the next sheet exactly
    // where the text moved — the caret jumps to the new page start.
    try {
      const tr = state.tr.split(sp, depth);
      if (!tr.docChanged) return false;
      view.dispatch(tr);
      // TEMPORARY debug marker — remove with the mount marker above.
      console.log("[CollabDocs] split a block across pages at", sp);
      return true;
    } catch {
      return false;
    }
  }, []);
  // Visual pagination for a single editor. Each sheet is PAGE_HEIGHT
  // tall with PAGE_GAP between sheets. Overflowing paragraph text is split
  // at the boundary (see above) so it flows onto the next sheet; any other
  // straddling block, or one starting past a boundary, gets margin-top so it
  // lands exactly at the top padding of its sheet. The gray gap between
  // sheets never holds text, so the caret can never sit between pages.
  const paginate = useCallback(() => {
    const stack = canvasRef.current;
    const el = stack?.querySelector(".tiptap");
    if (!stack || !el) return;
    const cs = getComputedStyle(el);
    const padTop = Number.parseFloat(cs.paddingTop) || 0;
    const padBottom = Number.parseFloat(cs.paddingBottom) || 0;
    const contentH = Math.max(1, PAGE_HEIGHT - padTop - padBottom);
    const kids = Array.from(el.children);
    for (const k of kids) {
      if (k.dataset.pageGap) {
        k.style.marginTop = "";
        delete k.dataset.pageGap;
      }
    }
    // Split pass on the natural flow (margins were just reset): break the
    // first paragraph crossing a page boundary. One split per run; the
    // resulting update re-runs pagination until every page is clean.
    const stackRect = stack.getBoundingClientRect();
    for (const k of kids) {
      const h = k.offsetHeight;
      if (h <= 0) continue;
      const relTop = k.offsetTop - padTop;
      const startPage = Math.max(0, Math.floor(relTop / contentH));
      const endPage = Math.max(startPage, Math.floor((relTop + h - 1) / contentH));
      if (endPage <= startPage) continue;
      if (splitAtPageBoundary(stackRect, padTop + (startPage + 1) * contentH, k, h, contentH))
        return;
    }
    let acc = 0;
    let cur = 0;
    for (const k of kids) {
      const h = k.offsetHeight;
      if (h <= 0) continue;
      const relTop = k.offsetTop - acc - padTop;
      const startPage = Math.max(0, Math.floor(relTop / contentH));
      const endPage = Math.max(startPage, Math.floor((relTop + h - 1) / contentH));
      if (endPage <= cur) continue;
      // Straddling block goes wholly to the next sheet; a block
      // starting on a later sheet aligns to that sheet.
      const target = Math.min(endPage, Math.max(startPage, cur + 1));
      const need = target * (PAGE_HEIGHT + PAGE_GAP) + padTop - k.offsetTop;
      if (need > 0.5) {
        const prev = Number.parseFloat(k.style.marginTop || "0") || 0;
        k.style.marginTop = `${prev + need}px`;
        k.dataset.pageGap = "1";
        acc += need;
      }
      cur = Math.max(cur, target);
    }
    const usable = el.scrollHeight - acc - padTop - padBottom;
    const pages = Math.max(1, Math.ceil(usable / contentH));
    setPageCount((p) => (p === pages ? p : pages));
    stack.style.height = `${pages * PAGE_HEIGHT + (pages - 1) * PAGE_GAP}px`;
  }, [splitAtPageBoundary]);
  const schedulePaginate = useCallback(() => {
    if (paginateTimer.current) clearTimeout(paginateTimer.current);
    paginateTimer.current = setTimeout(() => {
      requestAnimationFrame(() => paginate());
    }, 30);
  }, [paginate]);
  const recalcPages = useCallback(() => {
    schedulePaginate();
  }, [schedulePaginate]);
  // Side margins controlled by the ruler, persisted per document locally.
  // Read storage on a macrotask so the initial sync render stays pure.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(`collabdocs:margins:${documentId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
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
    }, 0);
    return () => clearTimeout(t);
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
        const json = editor.getJSON();
        const text = editor.getText();
        setWordCount(editor.storage.characterCount?.words?.() ?? 0);
        setSaveState("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void persist(json, text), 900);
        requestAnimationFrame(() => recalcPages());
        // Paginate shifts layout right after the keystroke, so the caret
        // can land below the fold on the new page. Follow it down to the
        // new page start. Never scroll up, so reading elsewhere is safe.
        if (caretTimer.current) clearTimeout(caretTimer.current);
        caretTimer.current = setTimeout(() => {
          try {
            if (editor.isDestroyed) return;
            const { from } = editor.state.selection;
            const c = editor.view.coordsAtPos(from);
            if (c.bottom > window.innerHeight - 40) {
              window.scrollTo({ top: window.scrollY + c.top - 140 });
            }
          } catch {
            // caret not measurable, keep scroll position
          }
        }, 120);
      },
    },
    [],
  );
  useEffect(() => {
    // TEMPORARY debug marker — proves which build the tab runs. Remove once
    // the pagination fix is confirmed working in the browser.
    console.log("[CollabDocs] paged editor v6 — split pagination active");
    editorRef.current = editor;
  }, [editor]);
  const persist = useCallback(
    async (json, text) => {
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
  // Flush any pending autosave immediately (File > Save, Ctrl+S).
  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!editor) return;
    setSaveState("saving");
    void persist(editor.getJSON(), editor.getText());
  }, [editor, persist]);
  const focusTitle = useCallback(() => {
    // The menubar restores focus to its trigger when it closes, which would
    // steal focus back from the title input. Defer past the close so the
    // cursor lands in the title with the current name (e.g. "Untitled
    // document") selected and ready to type over.
    window.setTimeout(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    }, 60);
  }, []);
  // Ctrl+S / Cmd+S saves now instead of opening the browser dialog.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);
  // Load once: API first, localStorage fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let content = null;
      let docTitle = "Untitled document";
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.document) {
            docTitle = data.document.title || docTitle;
            content = data.document.content ?? null;
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
      if (paginateTimer.current) clearTimeout(paginateTimer.current);
      if (caretTimer.current) clearTimeout(caretTimer.current);
    };
  }, []);
  // The gray strip between sheets is not writable. Route clicks landing
  // in a gap to the nearest sheet edge so the caret always sits on a
  // real page: end of the page above, or start of the page below.
  const routeGapClick = useCallback(
    (e) => {
      if (!editor) return;
      const stack = canvasRef.current;
      if (!stack) return;
      const rect = stack.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y < 0) return;
      const stride = PAGE_HEIGHT + PAGE_GAP;
      if (y % stride <= PAGE_HEIGHT) return; // on a sheet: default handling
      e.preventDefault();
      const gapBottom = y - (y % stride) + PAGE_HEIGHT;
      const aboveY = rect.top + gapBottom - 1;
      const belowY = rect.top + gapBottom + PAGE_GAP + 1;
      const goAbove = e.clientY - aboveY <= belowY - e.clientY;
      const targetY = goAbove ? aboveY : belowY;
      const toStart = !goAbove;
      try {
        const found = editor.view.posAtCoords({
          left: e.clientX,
          top: targetY,
        });
        if (found) {
          // Raw coordinates can resolve mid-word. Snap to the block
          // boundary instead: end of the page above, start of the
          // page below. The caret never lands inside a word.
          let selPos = found.pos;
          try {
            const $p = editor.state.doc.resolve(found.pos);
            if ($p.parent.isTextblock) {
              selPos = toStart ? $p.start() : $p.end();
            }
          } catch {
            // keep coordinate position
          }
          editor.chain().focus().setTextSelection(selPos).run();
          return;
        }
      } catch {
        // fall through to plain focus
      }
      editor.chain().focus().run();
    },
    [editor],
  );
  // Paginate on load, resize, margins change, and content growth.
  // Track current page from cursor when focused, else window scroll.
  useEffect(() => {
    recalcPages();
    const onResize = () => recalcPages();
    const onScroll = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let pastTop = Math.max(0, -rect.top + 96);
      try {
        if (editor && editor.isFocused) {
          const { from } = editor.state.selection;
          const coords = editor.view.coordsAtPos(from);
          pastTop = Math.max(0, coords.top - rect.top);
        }
      } catch {
        // keep scroll-based fallback
      }
      const stride = PAGE_HEIGHT + PAGE_GAP;
      setCurrentPage(Math.min(pageCount, Math.max(1, Math.floor(pastTop / stride) + 1)));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", onResize);
    const t = setTimeout(recalcPages, 300);
    // Images, fonts, and layout shifts change block heights after the
    // first measure. Re-paginate when the editor box changes size.
    let ro = null;
    const el = canvasRef.current?.querySelector(".tiptap");
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recalcPages());
      ro.observe(el);
    }
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => recalcPages()).catch(() => {});
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onResize);
      ro?.disconnect();
      clearTimeout(t);
    };
  }, [loaded, pageCount, recalcPages, editor, margins]);
  const saveTitle = useCallback(
    (next) => {
      setTitle(next);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        const now = new Date().toISOString();
        const existing = getLocalDocument(documentId);
        saveLocalDocument({
          id: documentId,
          title: next || "Untitled document",
          content: editor?.getJSON() ?? null,
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
            ref={titleRef}
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
          <span className="ml-auto flex shrink-0 items-center">
            <AccountMenu />
          </span>
        </div>
        <div className="flex h-8 items-center overflow-x-auto px-3">
          <DocumentMenubar
            editor={editor}
            documentId={documentId}
            title={title}
            onSave={saveNow}
            onRename={focusTitle}
          />
        </div>
      </header>

      <EditorToolbar editor={editor} title={title} />

      {/* Gray background, white sheets stacked with a gap.
            Max width 816px fixed. Starts one page, new sheets appear
            as content exceeds page size. Typing past the limit flows
            onto the next page. Ruler above controls side margins. */}
      <main className="flex flex-1 flex-col items-center bg-[#f8f9fa] px-4 py-6">
        <div className="w-full max-w-[816px]">
          <MarginRuler left={margins.left} right={margins.right} onChange={setMargins} />
        </div>
        <div
          ref={canvasRef}
          onMouseDown={routeGapClick}
          onClick={() => editor?.chain().focus().run()}
          style={{
            "--docs-margin-left": `${margins.left}px`,
            "--docs-margin-right": `${margins.right}px`,
          }}
          className="docs-stack w-full max-w-[816px] cursor-text text-black sm:rounded-t-none"
        >
          {!loaded || !editor ? (
            <div className="flex min-h-[1056px] items-center justify-center gap-2 rounded-md border border-[#dadce0] bg-white text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading document…
            </div>
          ) : (
            <>
              {Array.from({ length: pageCount }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="docs-sheet"
                  style={{ top: i * (PAGE_HEIGHT + PAGE_GAP) }}
                />
              ))}
              <EditorContent editor={editor} className="docs-editor-wrap docs-editor-overlay" />
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Page {currentPage} of {pageCount} — keep typing, new pages appear automatically.
        </p>
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
