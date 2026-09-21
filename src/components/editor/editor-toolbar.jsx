"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Download,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo,
  Strikethrough,
  Subscript,
  Superscript,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
  Unlink,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { downloadData, downloadDocument } from "./download";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  LINE_HEIGHTS,
  TEXT_COLORS,
} from "./extensions";
function Tool({ tip, active, disabled, onClick, children, label }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              onClick?.();
            }}
            className={cn("shrink-0", active && "bg-accent text-accent-foreground")}
            aria-label={label ?? tip}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  );
}
function Divider() {
  return <Separator orientation="vertical" className="mx-1 h-6 w-px shrink-0" />;
}
function NativeSelect({ value, onChange, options, tip, className, ariaLabel }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <select
            value={value}
            aria-label={ariaLabel}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "h-7 max-w-32 cursor-pointer truncate rounded-md border border-transparent bg-transparent px-1.5 text-[13px] outline-none hover:border-border hover:bg-muted focus:border-ring",
              className,
            )}
          >
            {options.map((o) => (
              <option key={o.value + o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  );
}
export function EditorToolbar({ editor, title, getExportData }) {
  const [, force] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const doDownload = (format) => {
    if (getExportData) {
      const data = getExportData();
      if (data) {
        downloadData(data, title ?? "Untitled document", format);
        setDownloadOpen(false);
        return;
      }
    }
    downloadDocument(editor, title ?? "Untitled document", format);
    setDownloadOpen(false);
  };
  useEffect(() => {
    if (!editor) return;
    // Selection + transaction + update can fire several times per
    // keystroke. Collapse them into one repaint per frame so the
    // 600-line toolbar does not re-render 3x per keypress.
    let raf = 0;
    const rerender = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => force((x) => x + 1));
    };
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    editor.on("update", rerender);
    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
      editor.off("update", rerender);
    };
  }, [editor]);
  const openLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    setLinkUrl(prev);
    setLinkOpen(true);
  }, [editor]);
  const handleLinkOpenChange = (open) => {
    setLinkOpen(open);
    if (open && editor) {
      const prev = editor.getAttributes("link").href ?? "";
      // sync input value when popover opens (event-driven, not effect)
      queueMicrotask(() => setLinkUrl(prev));
    }
  };
  if (!editor) return null;
  const currentStyle = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("heading", { level: 4 })
          ? "h4"
          : editor.isActive("heading", { level: 5 })
            ? "h5"
            : editor.isActive("heading", { level: 6 })
              ? "h6"
              : editor.isActive("blockquote")
                ? "quote"
                : editor.isActive("codeBlock")
                  ? "code"
                  : "p";
  const currentFont = editor.getAttributes("textStyle").fontFamily ?? "";
  const currentSizeRaw = editor.getAttributes("textStyle").fontSize ?? "";
  const currentSize = currentSizeRaw.replace("pt", "").replace("px", "");
  const currentAlign = editor.isActive({ textAlign: "center" })
    ? "center"
    : editor.isActive({ textAlign: "right" })
      ? "right"
      : editor.isActive({ textAlign: "justify" })
        ? "justify"
        : "left";
  const applyStyle = (v) => {
    if (v === "p") editor.chain().focus().setParagraph().run();
    else if (v === "quote") editor.chain().focus().toggleBlockquote().run();
    else if (v === "code") editor.chain().focus().toggleCodeBlock().run();
    else
      editor
        .chain()
        .focus()
        .setHeading({ level: Number(v.slice(1)) })
        .run();
  };
  const stepFontSize = (dir) => {
    const base = Number.parseInt(currentSize || "11", 10) || 11;
    const next = Math.min(96, Math.max(8, base + dir));
    editor.chain().focus().setFontSize(`${next}pt`).run();
  };
  const insertImage = () => {
    if (!imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl("");
    setImageOpen(false);
  };
  const uploadImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    setImageOpen(false);
  };
  return (
    <div
      className="sticky top-20 z-30 border-b border-border/70 bg-background/95 backdrop-blur"
      role="toolbar"
      aria-label="Document formatting toolbar"
    >
      <div className="flex flex-nowrap items-center gap-0.5 overflow-x-auto px-2 py-1.5 whitespace-nowrap sm:px-3 [scrollbar-width:thin]">
        <Tool
          tip="Undo (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo />
        </Tool>
        <Tool
          tip="Redo (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo />
        </Tool>

        {/* Download */}
        <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Download document">
                      <Download />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Download</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-52">
            <p className="text-xs font-medium">Download</p>
            <div className="grid gap-1">
              {[
                { label: "PDF document (.pdf)", format: "pdf" },
                { label: "Web page (.html)", format: "html" },
                { label: "Plain text (.txt)", format: "txt" },
                { label: "JSON (.json)", format: "json" },
              ].map((o) => (
                <Button
                  key={o.format}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => doDownload(o.format)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Divider />

        <NativeSelect
          ariaLabel="Text style"
          tip="Styles — Normal, Headings, Quote, Code"
          value={currentStyle}
          onChange={applyStyle}
          className="w-28 font-medium"
          options={[
            { label: "Normal text", value: "p" },
            { label: "Title", value: "h1" },
            { label: "Heading 1", value: "h1" },
            { label: "Heading 2", value: "h2" },
            { label: "Heading 3", value: "h3" },
            { label: "Heading 4", value: "h4" },
            { label: "Heading 5", value: "h5" },
            { label: "Heading 6", value: "h6" },
            { label: "Quote", value: "quote" },
            { label: "Code", value: "code" },
          ]}
        />
        <Divider />

        <NativeSelect
          ariaLabel="Font family"
          tip="Font"
          value={currentFont}
          onChange={(v) =>
            v
              ? editor.chain().focus().setFontFamily(v).run()
              : editor.chain().focus().unsetFontFamily().run()
          }
          className="hidden w-28 md:block"
          options={[
            { label: "Font", value: "" },
            ...FONT_FAMILIES.map((f) => ({ label: f.label, value: f.value })),
          ]}
        />
        <div className="flex items-center">
          <Tool
            tip="Decrease font size"
            onClick={() => stepFontSize(-1)}
            label="Decrease font size"
          >
            <Minus />
          </Tool>
          <NativeSelect
            ariaLabel="Font size"
            tip="Font size"
            value={FONT_SIZES.includes(currentSize) ? currentSize : ""}
            onChange={(v) => (v ? editor.chain().focus().setFontSize(`${v}pt`).run() : undefined)}
            className="w-14 text-center"
            options={[
              { label: currentSize ? `${currentSize}` : "11", value: "" },
              ...FONT_SIZES.map((s) => ({ label: s, value: s })),
            ]}
          />
          <Tool tip="Increase font size" onClick={() => stepFontSize(1)} label="Increase font size">
            <Plus />
          </Tool>
        </div>
        <Divider />

        <Tool
          tip="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </Tool>
        <Tool
          tip="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </Tool>
        <Tool
          tip="Underline (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </Tool>
        <Tool
          tip="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </Tool>
        <Tool
          tip="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code />
        </Tool>
        <Tool
          tip="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <Superscript />
        </Tool>
        <Tool
          tip="Subscript"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <Subscript />
        </Tool>
        <Tool
          tip="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <Eraser />
        </Tool>
        <Divider />

        {/* Text color */}
        <Popover>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Text color"
                      className="relative shrink-0"
                    >
                      <span className="text-base font-bold">A</span>
                      <span
                        className="absolute bottom-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full"
                        style={{ background: editor.getAttributes("textStyle").color || "#000" }}
                      />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Text color</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-56">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Text color</p>
            <div className="grid grid-cols-7 gap-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Text color ${c}`}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                  className="size-7 rounded-md border border-border"
                  style={{ background: c }}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Reset color
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Highlight color">
                      <Highlighter />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Highlight color</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-56">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Highlight</p>
            <div className="grid grid-cols-6 gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Highlight ${c}`}
                  onClick={() =>
                    c === "transparent"
                      ? editor.chain().focus().unsetHighlight().run()
                      : editor.chain().focus().toggleHighlight({ color: c }).run()
                  }
                  className="size-7 rounded-md border border-border"
                  style={{
                    background:
                      c === "transparent"
                        ? "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 12px 12px"
                        : c,
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Link */}
        <Popover open={linkOpen} onOpenChange={handleLinkOpenChange}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Insert link"
                      onClick={openLink}
                      className={cn(editor.isActive("link") && "bg-accent text-accent-foreground")}
                    >
                      <LinkIcon />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Insert link (Ctrl+K)</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-72">
            <p className="text-xs font-medium">Link</p>
            <div className="flex gap-1.5">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!linkUrl.trim()) editor.chain().focus().unsetLink().run();
                    else editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
                    setLinkOpen(false);
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!linkUrl.trim()) editor.chain().focus().unsetLink().run();
                  else editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
                  setLinkOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit px-1"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              <Unlink /> Remove link
            </Button>
          </PopoverContent>
        </Popover>
        <Divider />

        {/* Align */}
        <Tool
          tip="Align left"
          active={currentAlign === "left"}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </Tool>
        <Tool
          tip="Align center"
          active={currentAlign === "center"}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </Tool>
        <Tool
          tip="Align right"
          active={currentAlign === "right"}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </Tool>
        <Tool
          tip="Justify"
          active={currentAlign === "justify"}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify />
        </Tool>
        <NativeSelect
          ariaLabel="Line spacing"
          tip="Line spacing"
          value=""
          onChange={(v) => v && editor.chain().focus().setLineHeight(v).run()}
          className="hidden w-16 lg:block"
          options={[
            { label: "1.15", value: "" },
            ...LINE_HEIGHTS.map((l) => ({ label: l, value: l })),
          ]}
        />
        <Divider />

        <Tool
          tip="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </Tool>
        <Tool
          tip="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Tool>
        <Tool
          tip="Checklist"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks />
        </Tool>
        <Tool
          tip="Decrease indent (Shift+Tab)"
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        >
          <span className="text-sm">⇤</span>
        </Tool>
        <Tool
          tip="Increase indent (Tab)"
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        >
          <span className="text-sm">⇥</span>
        </Tool>
        <Divider />

        <Tool
          tip="Quote block"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </Tool>
        <Tool
          tip="Horizontal line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus />
        </Tool>

        {/* Image */}
        <Popover open={imageOpen} onOpenChange={setImageOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Insert image">
                      <ImageIcon />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Insert image</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-72">
            <p className="text-xs font-medium">Insert image</p>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… .png / .jpg"
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={insertImage}>
                Insert URL
              </Button>
              <label
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "cursor-pointer")}
              >
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage(e.target.files?.[0])}
                />
              </label>
            </div>
          </PopoverContent>
        </Popover>

        {/* Table */}
        <Popover open={tableOpen} onOpenChange={setTableOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Insert table">
                      <TableIcon />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Table</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-60">
            <p className="text-xs font-medium">Table</p>
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              >
                Insert 3×3
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                Add row
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                Add column
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                Delete row
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                Delete column
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                Toggle header
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                Delete table
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
