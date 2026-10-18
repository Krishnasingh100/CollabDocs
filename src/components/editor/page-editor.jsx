"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { getEditorExtensions } from "./extensions";
import "./editor.css";

// Takes page index plus flow controller ref; routes edge keys across pages; returns TipTap extension.
function pageFlowExtension(pageIndex, apiRef) {
  return Extension.create({
    name: "pageFlow",
    addKeyboardShortcuts() {
      const api = () => apiRef.current;
      return {
        Backspace: () => api().onBackspace(pageIndex),
        Delete: () => api().onDeleteForward(pageIndex),
        ArrowUp: () => api().onArrow(pageIndex, -1, false),
        ArrowDown: () => api().onArrow(pageIndex, 1, false),
        ArrowLeft: () => api().onArrow(pageIndex, -1, true),
        ArrowRight: () => api().onArrow(pageIndex, 1, true),
      };
    },
  });
}

// Takes page index, content, collab context and callbacks; hosts one fixed
// sheet editor; renders an editable page that is optionally shared live.
// Memoized: one page's keystrokes never re-render sibling sheets (fast typing).
export const PageEditor = memo(function PageEditor({
  pageIndex,
  initialContent,
  apiRef,
  onUpdate,
  onFocus,
  registerEditor,
  registerDom,
  collab,
}) {
  const collabEnabled = Boolean(collab?.ydoc);
  const extensions = useMemo(() => {
    const flow = pageFlowExtension(pageIndex, apiRef);
    if (!collab) return [...getEditorExtensions(), flow];
    // Collaboration owns undo (per-operations), so StarterKit's own history is
    // off; every sheet binds its own Yjs fragment named by page index so all
    // clients agree on the fragments behind each sheet.
    const list = [...getEditorExtensions({ collab: true }), flow];
    list.push(Collaboration.configure({ fragment: collab.ydoc.getXmlFragment(`sheet${pageIndex}`) }));
    if (collab.provider) {
      list.push(
        CollaborationCaret.configure({
          provider: collab.provider,
          user: collab.user ?? { name: "Me", color: "#1a73e8" },
          render: (user) => {
            const caretEl = globalThis.document.createElement("span");
            caretEl.classList.add("docs-collab-caret");
            caretEl.style.borderColor = user.color;
            const label = globalThis.document.createElement("span");
            label.classList.add("docs-collab-caret-label");
            label.style.backgroundColor = user.color;
            label.textContent = user.name;
            caretEl.appendChild(label);
            return caretEl;
          },
          selectionRender: (user) => ({
            nodeName: "span",
            class: "docs-collab-selection",
            "data-user": user.name,
            style: `background-color:${user.color}33`,
          }),
        }),
      );
    }
    return list;
  }, [pageIndex, collab, apiRef]);

  const editor = useEditor(
    {
      // Collab editors start empty: the Yjs fragment (or the seed effect below)
      // decides the content, never a stale client-side copy.
      extensions,
      content: collabEnabled ? { type: "doc", content: [] } : { type: "doc", content: initialContent ?? [] },
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "docs-page-editor",
          role: "textbox",
          "aria-label": `Document page ${pageIndex + 1}. Click and type.`,
        },
      },
      onUpdate: ({ editor: ed, transaction }) => onUpdate(pageIndex, ed, transaction),
      onFocus: () => onFocus(pageIndex),
    },
    [pageIndex, extensions],
  );

  // Seed page 0 once per session: when the room has no fragment content yet
  // (fresh owner-created document), push the loaded server/local block list
  // into the shared doc. Mid-flight joiners see remote content and skip this.
  useEffect(() => {
    if (!collabEnabled || !editor || editor.isDestroyed || pageIndex > 0) return;
    const frag = collab.ydoc.getXmlFragment("sheet0");
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (editor.isDestroyed) {
        clearInterval(timer);
        return;
      }
      const synced = !collab.provider || collab.provider.synced;
      if (!synced && tries < 25) return;
      clearInterval(timer);
      if (frag.length === 0 && editor.isEmpty && Array.isArray(initialContent) && initialContent.length > 0) {
        try {
          editor.commands.setContent({ type: "doc", content: initialContent });
        } catch {
          // keep the empty page; content will arrive via Yjs from another peer
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [pageIndex, editor, collabEnabled, collab, initialContent]);

  useEffect(() => {
    if (editor) registerEditor(pageIndex, editor);
    return () => registerEditor(pageIndex, null);
  }, [pageIndex, editor, registerEditor]);

  const domRef = useCallback((el) => registerDom(pageIndex, el), [pageIndex, registerDom]);

  return (
    <div ref={domRef} className="docs-sheet" data-page={pageIndex}>
      <EditorContent editor={editor} className="docs-page-wrap" />
    </div>
  );
});
