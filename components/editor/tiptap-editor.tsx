"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MenuBar } from "@/components/editor/menu-bar";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Link2,
  Highlighter, Table as TableIcon, ZoomIn, ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  "Inter", "Fraunces", "Arial", "Georgia", "Times New Roman",
  "Courier New", "Verdana", "Trebuchet MS",
];

const TEXT_COLORS = [
  "#1C2321", "#6B7280", "#DC2626", "#EA580C", "#D97706",
  "#059669", "#2563EB", "#7C3AED", "#DB2777", "#0891B2",
];

const HIGHLIGHT_COLORS = [
  "#FEF08A", "#FDE68A", "#BBF7D0", "#A7F3D0", "#BFDBFE",
  "#DDD6FE", "#FBCFE8", "#FECACA",
];

const BLOCK_TYPES = [
  { value: "paragraph", label: "Normal text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
];

export const TiptapEditor = forwardRef(function TiptapEditor(
  {
    documentId,
    initialContent,
    title,
  }: {
    documentId: string;
    initialContent: string;
    title: string;
  },
  ref: React.Ref<{ reloadContent: (content: string) => void }>
) {
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [zoom, setZoom] = useState(100);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      liveblocks,
      StarterKit.configure({ undoRedo: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[11in] px-16 py-14",
      },
    },
    onUpdate: ({ editor }) => {
      setStatus("unsaved");
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => save(editor.getHTML()), 1000);
    },
  });

  async function save(html: string) {
    setStatus("saving");
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      setStatus("saved");
    } catch {
      setStatus("unsaved");
    }
  }

  async function saveVersion() {
    await fetch("/api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, content: editor?.getHTML() }),
    });
  }

  function handleSetLink() {
    const url = window.prompt("Link URL");
    if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function applyTextColor(c: string) {
    setTextColor(c);
    editor?.chain().focus().setColor(c).run();
  }

  function applyHighlight(c: string) {
    setHighlightColor(c);
    editor?.chain().focus().toggleHighlight({ color: c }).run();
  }

  function currentBlockType(): string {
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  }

  function applyBlockType(value: string) {
    if (!editor) return;
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = Number(value.replace("h", "")) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  useImperativeHandle(ref, () => ({
    reloadContent: (content: string) => editor?.commands.setContent(content),
  }));

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      <MenuBar editor={editor} title={title} />

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-background px-4 py-2">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <select
          value={currentBlockType()}
          onChange={(e) => applyBlockType(e.target.value)}
          className="h-8 rounded border border-input bg-transparent px-1 text-xs outline-none"
        >
          {BLOCK_TYPES.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>

        <select
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="h-8 rounded border border-input bg-transparent px-1 text-xs outline-none"
          defaultValue=""
        >
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleSetLink} active={editor.isActive("link")}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-8 w-8 flex-col items-center justify-center rounded hover:bg-secondary"
              />
            }
          >
            <span className="text-sm font-medium leading-none">A</span>
            <span className="mt-0.5 h-1 w-4 rounded-full" style={{ backgroundColor: textColor }} />
          </PopoverTrigger>
          <PopoverContent className="grid w-auto grid-cols-5 gap-1.5 p-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyTextColor(c)}
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: c }}
                aria-label={`Text color ${c}`}
              />
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-8 w-8 flex-col items-center justify-center rounded hover:bg-secondary"
              />
            }
          >
            <Highlighter className="h-4 w-4" />
            <span className="mt-0.5 h-1 w-4 rounded-full" style={{ backgroundColor: highlightColor }} />
          </PopoverTrigger>
          <PopoverContent className="grid w-auto grid-cols-4 gap-1.5 p-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyHighlight(c)}
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: c }}
                aria-label={`Highlight ${c}`}
              />
            ))}
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={false}
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <button
          type="button"
          onClick={saveVersion}
          className="ml-2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Save version
        </button>

        <span className="ml-auto text-xs text-muted-foreground">
          {status === "saving" ? "Saving…" : status === "unsaved" ? "Unsaved changes" : "Saved"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-secondary/40">
        <div
          className="mx-auto my-10 origin-top rounded-sm border border-border bg-white shadow-card"
          style={{ width: "8.5in", transform: `scale(${zoom / 100})` }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border bg-background px-4 py-1.5">
        <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={50}
          max={150}
          step={10}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 w-40 accent-primary"
        />
        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="w-10 text-xs text-muted-foreground">{zoom}%</span>
      </div>
    </div>
  );
});

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded hover:bg-secondary",
        active && "bg-secondary text-primary"
      )}
    >
      {children}
    </button>
  );
}