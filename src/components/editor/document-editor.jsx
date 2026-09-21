"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getLocalDocument, saveLocalDocument } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./editor-toolbar";
import { DEFAULT_MARGIN, MarginRuler } from "./margin-ruler";
import { DocumentMenubar } from "./document-menubar";
import { AccountMenu } from "@/components/auth/account-menu";
import { PageEditor } from "./page-editor";
import "./editor.css";

// True separate pages: one sheet per page, each hosting its own TipTap
// editor. A page that outgrows its sheet pushes overflowing blocks into the
// next sheet (creating one when needed), and sheets with room pull blocks up
// after deletions. Text lives inside exactly one sheet, so nothing —
// caret included — can ever render in the gray gap between pages.

const PAGE_HEIGHT = 1056;
const MAX_REFLOW_RUNS = 50;

function docIsEmpty(doc) {
  if (doc.childCount === 0) return true;
  return doc.childCount === 1 && doc.firstChild.isTextblock && doc.firstChild.content.size === 0;
}

function topAt(view, pos) {
  try {
    return view.coordsAtPos(pos).top;
  } catch {
    return null;
  }
}

// Keep the caret on screen after it rides moved content to another sheet.
function ensureCaretVisible(ed) {
  try {
    const c = ed.view.coordsAtPos(ed.state.selection.from);
    if (c.bottom > window.innerHeight - 80) {
      window.scrollBy({ top: c.bottom - window.innerHeight + 120 });
    } else if (c.top < 160) {
      window.scrollBy({ top: c.top - 160 });
    }
  } catch {
    // caret not measurable, keep scroll position
  }
}

function atDocStart(ed) {
  const sel = ed.state.selection;
  if (!sel.empty) return false;
  const $from = sel.$from;
  return $from.depth <= 1 && $from.parentOffset === 0 && $from.index(0) === 0;
}

function atDocEnd(ed) {
  const sel = ed.state.selection;
  if (!sel.empty) return false;
  const $to = sel.$to;
  const doc = ed.state.doc;
  if ($to.pos === doc.content.size) return true;
  return (
    $to.depth <= 1 &&
    $to.parent.isTextblock &&
    $to.parentOffset === $to.parent.content.size &&
    $to.index(0) === doc.childCount - 1
  );
}

// Decide what to do with the overflowing tail of page editor ed:
// - { kind: "split", sp, depth }: the last block straddles the sheet end and
//   its text can break there — keep the lines above on this sheet (the last
//   line stays put) and move only the lines below down.
// - { kind: "whole" }: move the whole last block down — it sits fully below
//   the sheet end, is atomic (image/table), or is too short to break 2/2.
// - { kind: "stay" }: a block taller than the sheet that cannot break —
//   leave it; its sheet grows instead of hiding content. Never move it
//   whole, or it would march down forever creating blank sheets.
// - null: nothing to do.
function classifyLastNode(ed, contentH, padTop) {
  if (!ed || ed.isDestroyed) return null;
  const view = ed.view;
  const { state } = view;
  const doc = state.doc;
  const last = doc.lastChild;
  if (!last) return null;
  let start = 0;
  doc.content.forEach((node, offset) => {
    start = offset;
  });
  let el = null;
  try {
    el = view.nodeDOM(start);
  } catch {
    el = null;
  }
  if (!el) return { kind: "whole" };
  const domH = el.offsetHeight || 0;
  const domTop = (el.offsetTop || 0) - padTop;
  if (domH <= 0) return { kind: "whole" };
  const tall = domH > contentH;
  const straddles = domTop < contentH - 0.5 && domTop + domH > contentH + 0.5;
  if (!straddles && !tall) return { kind: "whole" };
  const tipRect = view.dom.getBoundingClientRect();
  const boundaryTop = tipRect.top + padTop + contentH;
  // Locate splittable text: a direct paragraph/heading, or a paragraph or
  // heading inside a list or quote — never tables or code.
  let range = null;
  const t = last.type.name;
  if (t === "paragraph" || t === "heading") {
    range = { bStart: start + 1, bEnd: start + last.nodeSize - 1, depth: 1 };
  } else if (t === "bullet_list" || t === "ordered_list" || t === "blockquote") {
    const blocks = el.querySelectorAll("p, h1, h2, h3, h4, h5, h6");
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (!(r.top < boundaryTop - 2 && r.bottom > boundaryTop - 2)) continue;
      let $b;
      try {
        $b = state.doc.resolve(view.posAtDOM(b, 0));
      } catch {
        continue;
      }
      if ($b.parent.type.name !== "paragraph" && $b.parent.type.name !== "heading") continue;
      let bad = false;
      for (let d = 1; d <= $b.depth; d++) {
        const name = $b.node(d)?.type.name;
        if (
          name === "table" ||
          name === "table_row" ||
          name === "table_cell" ||
          name === "table_header" ||
          name === "code_block"
        ) {
          bad = true;
          break;
        }
      }
      if (bad) continue;
      let topDom = null;
      try {
        topDom = view.nodeDOM($b.start(1) - 1);
      } catch {
        topDom = null;
      }
      if (topDom !== el) continue;
      range = { bStart: $b.start(), bEnd: $b.end(), depth: $b.depth };
      break;
    }
  }
  if (!range) return tall ? { kind: "stay" } : { kind: "whole" };
  const { bStart, bEnd, depth } = range;
  const firstTop = topAt(view, bStart);
  const lastTop = topAt(view, bEnd);
  if (firstTop == null || lastTop == null) return tall ? { kind: "stay" } : { kind: "whole" };
  if (lastTop < boundaryTop - 2) return { kind: "whole" };
  if (firstTop >= boundaryTop - 2) return { kind: "whole" };
  let lo = bStart;
  let hi = bEnd;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const mt = topAt(view, mid);
    if (mt == null) {
      hi = mid - 1;
      continue;
    }
    if (mt < boundaryTop - 2) lo = mid;
    else hi = mid - 1;
  }
  const loTop = topAt(view, lo);
  if (loTop == null) return tall ? { kind: "stay" } : { kind: "whole" };
  let sp = lo;
  let guard = 0;
  let moved = false;
  while (guard++ < 800) {
    if (sp + 1 > bEnd) return tall ? { kind: "stay" } : { kind: "whole" };
    const nt = topAt(view, sp + 1);
    if (nt == null) return tall ? { kind: "stay" } : { kind: "whole" };
    sp += 1;
    moved = true;
    if (nt !== loTop) break;
  }
  if (!moved || sp <= bStart || sp >= bEnd) return tall ? { kind: "stay" } : { kind: "whole" };
  // A block taller than the sheet must break — moving it whole would march
  // it down forever. A strictly-inside sp already leaves a line each side.
  if (tall) return { kind: "split", sp, depth };
  // Short block: count lines (bounded walks — wrapping bounds line length,
  // so an exhausted walk means many lines).
  const spTop = topAt(view, sp);
  if (spTop == null) return { kind: "whole" };
  let below = 1;
  let top = spTop;
  let q = sp;
  guard = 0;
  let exhausted = false;
  while (q < bEnd) {
    if (guard++ >= 1500) {
      exhausted = true;
      break;
    }
    q += 1;
    const nt = topAt(view, q);
    if (nt == null) break;
    if (nt !== top) {
      below += 1;
      top = nt;
      if (below >= 2) break;
    }
  }
  if (exhausted) below = 2;
  let above = 1;
  const startTop = topAt(view, bStart);
  if (startTop == null) return { kind: "whole" };
  top = startTop;
  q = bStart;
  guard = 0;
  exhausted = false;
  while (q + 1 < sp) {
    if (guard++ >= 2500) {
      exhausted = true;
      break;
    }
    q += 1;
    const nt = topAt(view, q);
    if (nt == null) break;
    if (nt !== top) {
      above += 1;
      top = nt;
      if (above >= 3) break;
    }
  }
  if (exhausted) above = 3;
  let total = 1;
  top = startTop;
  q = bStart;
  guard = 0;
  exhausted = false;
  while (q < bEnd && total <= 2) {
    if (guard++ >= 4000) {
      exhausted = true;
      break;
    }
    q += 1;
    const nt = topAt(view, q);
    if (nt == null) break;
    if (nt !== top) {
      total += 1;
      top = nt;
    }
  }
  if (exhausted) total = 99;
  // Tiny blocks and widows move whole (Word keep-together); everything else
  // breaks so the sheet stays filled to its last line.
  if (total <= 2) return { kind: "whole" };
  if (above < 2) return { kind: "whole" };
  if (below >= 2) return { kind: "split", sp, depth };
  // Single orphan line below: step back one full line when at least three
  // lines stay above, so the next sheet starts with two lines.
  if (above >= 3) {
    const prevTop = topAt(view, sp - 1);
    if (prevTop == null) return { kind: "whole" };
    let back = sp - 1;
    guard = 0;
    while (guard++ < 800) {
      if (back - 1 < bStart) break;
      const nt = topAt(view, back - 1);
      if (nt == null || nt !== prevTop) break;
      back -= 1;
    }
    if (back > bStart) return { kind: "split", sp: back, depth };
  }
  return { kind: "whole" };
}

export function DocumentEditor({ documentId }) {
  const [title, setTitle] = useState("Untitled document");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeEditor, setActiveEditor] = useState(null);
  const [margins, setMargins] = useState({ left: DEFAULT_MARGIN, right: DEFAULT_MARGIN });
  const [initialPages, setInitialPages] = useState([[]]);

  const editorsRef = useRef(new Map());
  const sheetsRef = useRef(new Map());
  const activeIndexRef = useRef(0);
  const pageCountRef = useRef(1);
  const loadedRef = useRef(false);
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const titleRef = useRef(null);
  const pagesBoxRef = useRef(null);
  const reflowTimer = useRef(null);
  const reflowRuns = useRef(0);
  const reflowing = useRef(false);
  const reflowRef = useRef(null);
  const persistRef = useRef(null);
  const apiRef = useRef(null);

  const setPages = useCallback((n) => {
    const next = Math.max(1, n);
    pageCountRef.current = next;
    setPageCount(next);
  }, []);

  const measureContent = useCallback(() => {
    for (const sheet of sheetsRef.current.values()) {
      const el = sheet?.querySelector(".tiptap");
      if (!el) continue;
      const cs = getComputedStyle(el);
      const padTop = Number.parseFloat(cs.paddingTop) || 0;
      const padBottom = Number.parseFloat(cs.paddingBottom) || 0;
      return { contentH: Math.max(1, PAGE_HEIGHT - padTop - padBottom), padTop, padBottom };
    }
    return { contentH: PAGE_HEIGHT - 96, padTop: 48, padBottom: 48 };
  }, []);

  const pageUsed = useCallback((i, padTop, padBottom) => {
    const sheet = sheetsRef.current.get(i);
    const el = sheet?.querySelector(".tiptap");
    if (!el) return 0;
    return Math.max(0, el.scrollHeight - padTop - padBottom);
  }, []);

  const nodeHeight = useCallback((ed, pos) => {
    try {
      return ed.view.nodeDOM(pos)?.offsetHeight ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const scheduleReflow = useCallback(() => {
    if (reflowTimer.current) clearTimeout(reflowTimer.current);
    reflowTimer.current = setTimeout(() => {
      requestAnimationFrame(() => reflowRef.current?.());
    }, 30);
  }, []);

  const focusPage = useCallback((i, pos) => {
    const count = pageCountRef.current;
    const idx = Math.max(0, Math.min(count - 1, i));
    const ed = editorsRef.current.get(idx);
    if (!ed || ed.isDestroyed) return false;
    activeIndexRef.current = idx;
    setCurrentPage(idx + 1);
    setActiveEditor(ed);
    try {
      if (typeof pos === "number" || pos === "start" || pos === "end") {
        ed.chain().focus(pos).run();
      } else {
        ed.commands.focus();
      }
    } catch {
      try {
        ed.commands.focus();
      } catch {
        // editor gone mid-focus, caret stays where it was
      }
    }
    ensureCaretVisible(ed);
    return true;
  }, []);

  // Move the last block of page i to the top of page i + 1, carrying the
  // caret along when it sat inside the moved block.
  const moveLastNodeDown = useCallback((i) => {
    const ed = editorsRef.current.get(i);
    const next = editorsRef.current.get(i + 1);
    if (!ed || !next || ed.isDestroyed || next.isDestroyed) return false;
    const doc = ed.state.doc;
    const last = doc.lastChild;
    if (!last) return false;
    let start = 0;
    doc.content.forEach((node, offset) => {
      start = offset;
    });
    const node = ed.schema.nodeFromJSON(last.toJSON());
    let caret = null;
    if (ed.isFocused) {
      const sel = ed.state.selection;
      const end = start + last.nodeSize;
      if (sel.from < end && sel.to > start) {
        caret = {
          from: Math.max(0, sel.from - start),
          to: Math.min(last.nodeSize, sel.to - start),
        };
      }
    }
    if (docIsEmpty(next.state.doc)) {
      const tr = next.state.tr.replaceWith(0, next.state.doc.content.size, node);
      tr.setMeta("pageflow", true);
      next.view.dispatch(tr);
    } else {
      const tr = next.state.tr.insert(0, node);
      tr.setMeta("pageflow", true);
      next.view.dispatch(tr);
    }
    if (doc.childCount === 1) {
      const empty = ed.schema.nodes.paragraph.create();
      const tr = ed.state.tr.replaceWith(0, doc.content.size, empty);
      tr.setMeta("pageflow", true);
      ed.view.dispatch(tr);
    } else {
      const tr = ed.state.tr.delete(start, start + last.nodeSize);
      tr.setMeta("pageflow", true);
      ed.view.dispatch(tr);
    }
    if (caret) {
      const n = editorsRef.current.get(i + 1);
      if (n && !n.isDestroyed) {
        activeIndexRef.current = i + 1;
        setCurrentPage(i + 2);
        setActiveEditor(n);
        try {
          n.chain().focus(caret.from).setTextSelection({ from: caret.from, to: caret.to }).run();
          ensureCaretVisible(n);
        } catch {
          try {
            n.commands.focus("start");
          } catch {
            // target gone, caret stays where it was
          }
        }
      }
    }
    return true;
  }, []);

  // Move the first block of page i to the end of page i - 1 (fills gaps left
  // by deletions), carrying the caret along when it sat inside the block.
  const moveFirstNodeUp = useCallback((srcIdx) => {
    const prev = editorsRef.current.get(srcIdx - 1);
    const src = editorsRef.current.get(srcIdx);
    if (!prev || !src || prev.isDestroyed || src.isDestroyed) return false;
    const first = src.state.doc.firstChild;
    if (!first) return false;
    const node = src.schema.nodeFromJSON(first.toJSON());
    let caret = null;
    let base = 0;
    if (docIsEmpty(prev.state.doc)) {
      const tr = prev.state.tr.replaceWith(0, prev.state.doc.content.size, node);
      tr.setMeta("pageflow", true);
      prev.view.dispatch(tr);
      base = 0;
    } else {
      base = prev.state.doc.content.size;
      const tr = prev.state.tr.insert(base, node);
      tr.setMeta("pageflow", true);
      prev.view.dispatch(tr);
    }
    if (src.isFocused) {
      const sel = src.state.selection;
      if (sel.from < first.nodeSize && sel.to > 0) {
        caret = {
          from: base + Math.max(0, sel.from),
          to: base + Math.min(first.nodeSize, sel.to),
        };
      }
    }
    if (src.state.doc.childCount === 1) {
      const empty = src.schema.nodes.paragraph.create();
      const tr = src.state.tr.replaceWith(0, src.state.doc.content.size, empty);
      tr.setMeta("pageflow", true);
      src.view.dispatch(tr);
    } else {
      const tr = src.state.tr.delete(0, first.nodeSize);
      tr.setMeta("pageflow", true);
      src.view.dispatch(tr);
    }
    if (caret) {
      const p = editorsRef.current.get(srcIdx - 1);
      if (p && !p.isDestroyed) {
        activeIndexRef.current = srcIdx - 1;
        setCurrentPage(srcIdx);
        setActiveEditor(p);
        try {
          p.chain().focus(caret.from).setTextSelection({ from: caret.from, to: caret.to }).run();
          ensureCaretVisible(p);
        } catch {
          try {
            p.commands.focus("end");
          } catch {
            // target gone, caret stays where it was
          }
        }
      }
    }
    return true;
  }, []);

  // The flow engine: pull blocks up into gaps, push overflowing blocks down
  // (creating sheets as needed), and drop trailing empty sheets. Pulls only
  // fit checked blocks and pushes only strict overflows, so the two passes
  // cannot undo each other — the loop converges instead of ping-ponging.
  const reflow = useCallback(() => {
    if (reflowing.current) return;
    const count = pageCountRef.current;
    let ready = 0;
    for (let i = 0; i < count; i++) {
      const ed = editorsRef.current.get(i);
      if (ed && !ed.isDestroyed) ready++;
    }
    if (ready === 0) {
      if (loadedRef.current) scheduleReflow();
      return;
    }
    reflowing.current = true;
    let moves = 0;
    let skippedComposing = false;
    try {
      const { contentH, padTop, padBottom } = measureContent();
      for (let i = 0; i < count - 1; i++) {
        let guard = 0;
        while (guard++ < 6) {
          const ed = editorsRef.current.get(i);
          const nxt = editorsRef.current.get(i + 1);
          if (!ed || !nxt || ed.isDestroyed || nxt.isDestroyed) break;
          // Never disturb an editor mid-composition (IME); retry afterwards.
          if (ed.view.composing || nxt.view.composing) {
            skippedComposing = true;
            break;
          }
          if (docIsEmpty(nxt.state.doc)) break;
          const used = pageUsed(i, padTop, padBottom);
          const h = nodeHeight(nxt, 0);
          if (used + h > contentH + 1) break;
          if (!moveFirstNodeUp(i + 1)) break;
          moves++;
        }
      }
      for (let i = 0; i < pageCountRef.current; i++) {
        const ed = editorsRef.current.get(i);
        if (!ed || ed.isDestroyed) continue;
        if (ed.view.composing) {
          skippedComposing = true;
          continue;
        }
        let guard = 0;
        while (guard++ < 40 && pageUsed(i, padTop, padBottom) > contentH + 1) {
          const doc = ed.state.doc;
          if (doc.childCount === 0) break;
          if (i + 1 >= pageCountRef.current) {
            const over = pageUsed(i, padTop, padBottom) - contentH;
            const add = Math.max(1, Math.min(10, Math.ceil(over / contentH)));
            setPages(pageCountRef.current + add);
            scheduleReflow();
            return;
          }
          const nx = editorsRef.current.get(i + 1);
          if (nx && !nx.isDestroyed && nx.view.composing) {
            skippedComposing = true;
            break;
          }
          // Straddle-aware push: a last block crossing the sheet end breaks
          // there (its lines above stay put — the last line never vanishes);
          // only fully-overflowed, atomic, or tiny blocks move whole.
          const verdict = classifyLastNode(ed, contentH, padTop);
          if (verdict && verdict.kind === "split") {
            try {
              const tr = ed.state.tr.split(verdict.sp, verdict.depth);
              tr.setMeta("pageflow", true);
              if (!tr.docChanged) break;
              ed.view.dispatch(tr);
              moves++;
              continue;
            } catch {
              break;
            }
          }
          if (verdict && verdict.kind === "stay") break;
          if (!moveLastNodeDown(i)) break;
          moves++;
        }
      }
      let c = pageCountRef.current;
      while (c > 1) {
        if (activeIndexRef.current === c - 1) break;
        const last = editorsRef.current.get(c - 1);
        if (!last || last.isDestroyed || !docIsEmpty(last.state.doc)) break;
        c--;
      }
      if (c !== pageCountRef.current) setPages(c);
    } finally {
      reflowing.current = false;
    }
    if (skippedComposing) scheduleReflow();
    if (moves > 0) {
      reflowRuns.current += 1;
      if (reflowRuns.current > MAX_REFLOW_RUNS) {
        reflowRuns.current = 0;
        return;
      }
      scheduleReflow();
    } else {
      reflowRuns.current = 0;
    }
  }, [
    measureContent,
    pageUsed,
    nodeHeight,
    moveFirstNodeUp,
    moveLastNodeDown,
    setPages,
    scheduleReflow,
  ]);

  useEffect(() => {
    reflowRef.current = reflow;
  });

  const registerEditor = useCallback(
    (i, ed) => {
      if (ed) {
        editorsRef.current.set(i, ed);
        if (activeIndexRef.current === i) setActiveEditor(ed);
        let words = 0;
        for (const e of editorsRef.current.values()) {
          if (e && !e.isDestroyed) words += e.storage.characterCount?.words?.() ?? 0;
        }
        setWordCount(words);
        scheduleReflow();
      } else {
        const cur = editorsRef.current.get(i);
        if (cur) {
          editorsRef.current.delete(i);
          setActiveEditor((prev) => (prev === cur ? null : prev));
        }
      }
    },
    [scheduleReflow],
  );

  const registerDom = useCallback((i, el) => {
    if (el) sheetsRef.current.set(i, el);
    else sheetsRef.current.delete(i);
  }, []);

  const onPageFocus = useCallback((i) => {
    activeIndexRef.current = i;
    setCurrentPage(i + 1);
    const ed = editorsRef.current.get(i);
    if (ed && !ed.isDestroyed) setActiveEditor(ed);
  }, []);

  const buildFullDoc = useCallback(() => {
    const content = [];
    const texts = [];
    for (let i = 0; i < pageCountRef.current; i++) {
      const ed = editorsRef.current.get(i);
      if (!ed || ed.isDestroyed) continue;
      const json = ed.getJSON();
      if (json.content) content.push(...json.content);
      const t = ed.getText();
      if (t) texts.push(t);
    }
    return { content, text: texts.join("\n") };
  }, []);

  const getExportData = useCallback(() => {
    const { content, text } = buildFullDoc();
    let html = "";
    for (let i = 0; i < pageCountRef.current; i++) {
      const ed = editorsRef.current.get(i);
      if (ed && !ed.isDestroyed) {
        try {
          html += ed.getHTML();
        } catch {
          // skip a page that cannot render right now
        }
      }
    }
    return { json: { type: "doc", content }, html, text };
  }, [buildFullDoc]);

  const persist = useCallback(async () => {
    const now = new Date().toISOString();
    const { content, text } = buildFullDoc();
    const existing = getLocalDocument(documentId);
    saveLocalDocument({
      id: documentId,
      title,
      content: { type: "doc", content },
      plainText: text.slice(0, 20000),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { type: "doc", content },
          plainText: text.slice(0, 20000),
          title,
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      setSaveState("saved");
    } catch {
      setSaveState("offline");
    }
  }, [documentId, title, buildFullDoc]);

  useEffect(() => {
    persistRef.current = persist;
  });

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    void persistRef.current?.();
  }, []);

  const onPageUpdate = useCallback(
    (i, ed, transaction) => {
      let words = 0;
      for (const e of editorsRef.current.values()) {
        if (e && !e.isDestroyed) words += e.storage.characterCount?.words?.() ?? 0;
      }
      setWordCount(words);
      const meta = transaction?.getMeta("pageflow");
      if (!meta) {
        setSaveState("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persistRef.current?.(), 900);
        reflowRuns.current = 0;
      }
      // User edits reflow synchronously so each keystroke flows exactly its
      // own overflow (Word-like) instead of piling lines up past the sheet
      // end and yanking them all at once. Reflow's own moves stay async.
      // The reflow skips composing pages itself and retries afterwards.
      if (meta) scheduleReflow();
      else reflowRef.current?.();
    },
    [scheduleReflow],
  );

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

  // Cross-page flow controller for the per-page keymaps (Backspace/Delete at
  // page edges, arrows across pages). Always the latest closures: the page
  // extensions call through apiRef at keypress time.
  useEffect(() => {
    apiRef.current = {
      onBackspace(i) {
        const ed = editorsRef.current.get(i);
        if (!ed || ed.isDestroyed || i <= 0) return false;
        if (!atDocStart(ed)) return false;
        return focusPage(i - 1, "end");
      },
      onDeleteForward(i) {
        const ed = editorsRef.current.get(i);
        if (!ed || ed.isDestroyed || i >= pageCountRef.current - 1) return false;
        if (!atDocEnd(ed)) return false;
        return focusPage(i + 1, "start");
      },
      onArrow(i, dir) {
        const ed = editorsRef.current.get(i);
        if (!ed || ed.isDestroyed) return false;
        if (dir < 0) {
          if (i <= 0 || !atDocStart(ed)) return false;
          return focusPage(i - 1, "end");
        }
        if (i >= pageCountRef.current - 1 || !atDocEnd(ed)) return false;
        return focusPage(i + 1, "start");
      },
    };
  });

  // Load once: API first, localStorage fallback. Everything lands on page 0
  // first; the reflow then distributes it across sheets.
  useEffect(() => {
    let cancelled = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (titleTimer.current) clearTimeout(titleTimer.current);
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
      if (cancelled) return;
      const arr = content && Array.isArray(content.content) ? content.content : [];
      setTitle(docTitle);
      setInitialPages([arr]);
      const ed0 = editorsRef.current.get(0);
      if (ed0 && !ed0.isDestroyed) {
        try {
          ed0.commands.setContent(
            arr.length
              ? { type: "doc", content: arr }
              : { type: "doc", content: [{ type: "paragraph" }] },
          );
        } catch {
          // keep the current page content
        }
      }
      setPages(1);
      activeIndexRef.current = 0;
      setCurrentPage(1);
      setActiveEditor(ed0 && !ed0.isDestroyed ? ed0 : null);
      setLoaded(true);
      loadedRef.current = true;
      scheduleReflow();
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, setPages, scheduleReflow]);

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

  // Reflow on resize, webfont arrival, and layout shifts.
  useEffect(() => {
    scheduleReflow();
    const onResize = () => scheduleReflow();
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    const t = setTimeout(scheduleReflow, 300);
    let ro = null;
    const box = pagesBoxRef.current;
    if (box && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => scheduleReflow());
      ro.observe(box);
    }
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => scheduleReflow()).catch(() => {});
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      ro?.disconnect();
      clearTimeout(t);
    };
  }, [loaded, pageCount, scheduleReflow]);

  // Page indicator follows the window scroll when no page has focus (focus
  // itself tracks the current page through onPageFocus).
  useEffect(() => {
    const onScroll = () => {
      const box = pagesBoxRef.current;
      if (!box) return;
      try {
        let focused = false;
        for (const e of editorsRef.current.values()) {
          if (e && !e.isDestroyed && e.isFocused) {
            focused = true;
            break;
          }
        }
        if (focused) return;
        const rect = box.getBoundingClientRect();
        const past = Math.max(0, -rect.top + 96);
        let idx = 0;
        for (const [i, sheet] of sheetsRef.current) {
          if (sheet.offsetTop <= past) idx = i;
        }
        setCurrentPage(Math.min(pageCountRef.current, Math.max(1, idx + 1)));
      } catch {
        // keep the last page indicator
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (reflowTimer.current) clearTimeout(reflowTimer.current);
    };
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

  // Clicks landing between sheets (gray gap) focus the nearest page edge, so
  // the caret always sits inside a real page. Clicks inside a sheet use the
  // native editor behavior.
  const routeGapClick = useCallback(
    (e) => {
      if (e.target.closest(".docs-sheet")) return;
      const box = pagesBoxRef.current;
      if (!box) return;
      const y = e.clientY - box.getBoundingClientRect().top;
      const sheets = [...sheetsRef.current.entries()].sort((a, b) => a[0] - b[0]);
      if (sheets.length === 0) return;
      let target = 0;
      let where = "start";
      for (const [i, sheet] of sheets) {
        const top = sheet.offsetTop;
        const bottom = top + sheet.offsetHeight;
        if (y < top) {
          target = i;
          where = "start";
          break;
        }
        target = i;
        where = y - top < (bottom - top) / 2 ? "start" : "end";
      }
      e.preventDefault();
      focusPage(target, where);
    },
    [focusPage],
  );

  const saveTitle = useCallback(
    (next) => {
      setTitle(next);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        const now = new Date().toISOString();
        const existing = getLocalDocument(documentId);
        const { content, text } = buildFullDoc();
        saveLocalDocument({
          id: documentId,
          title: next || "Untitled document",
          content: { type: "doc", content },
          plainText: text || existing?.plainText || "",
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
    [documentId, buildFullDoc],
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
            editor={activeEditor}
            documentId={documentId}
            title={title}
            onSave={saveNow}
            onRename={focusTitle}
            getExportData={getExportData}
          />
        </div>
      </header>

      <EditorToolbar editor={activeEditor} title={title} getExportData={getExportData} />

      {/* Real separate sheets: page 1 fills to its limit, then overflow
          flows into a newly created page 2 below it — like Word. */}
      <main className="flex flex-1 flex-col items-center bg-[#f8f9fa] px-4 py-6">
        <div className="w-full max-w-[816px]">
          <MarginRuler left={margins.left} right={margins.right} onChange={setMargins} />
        </div>
        <div
          ref={pagesBoxRef}
          onMouseDown={routeGapClick}
          style={{
            "--docs-margin-left": `${margins.left}px`,
            "--docs-margin-right": `${margins.right}px`,
          }}
          className="docs-pages w-full max-w-[816px] text-black"
        >
          {!loaded ? (
            <div className="docs-sheet flex min-h-[1056px] items-center justify-center gap-2 bg-white text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading document…
            </div>
          ) : (
            Array.from({ length: pageCount }, (_, i) => (
              <PageEditor
                key={i}
                pageIndex={i}
                initialContent={initialPages[i] ?? []}
                apiRef={apiRef}
                onUpdate={onPageUpdate}
                onFocus={onPageFocus}
                registerEditor={registerEditor}
                registerDom={registerDom}
              />
            ))
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
