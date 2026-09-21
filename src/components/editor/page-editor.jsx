"use client";

import { useCallback, useEffect } from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { getEditorExtensions } from "./extensions";
import "./editor.css";

// Cross-page keys for one sheet. Every handler returns false unless the
// caret sits exactly at the page edge, so all normal editing (lists, tables,
// mid-document arrows) keeps TipTap's default behavior. The parent answers
// through apiRef, which always points at the latest flow controller.
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

// One real page: a fixed-height sheet hosting its own TipTap editor.
// Content arrives once via initialContent; afterwards the parent moves nodes
// between pages with transactions, never by replacing content (so the caret,
// IME composition, and undo history survive reflow).
export function PageEditor({
  pageIndex,
  initialContent,
  apiRef,
  onUpdate,
  onFocus,
  registerEditor,
  registerDom,
}) {
  const editor = useEditor(
    {
      extensions: [...getEditorExtensions(), pageFlowExtension(pageIndex, apiRef)],
      content: { type: "doc", content: initialContent ?? [] },
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
    [pageIndex],
  );

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
}
