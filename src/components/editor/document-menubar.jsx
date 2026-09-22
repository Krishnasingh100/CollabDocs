"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { createLocalDocument, deleteLocalDocument } from "@/lib/documents";
import { downloadData, downloadDocument } from "./download";
export function DocumentMenubar({
  editor,
  documentId,
  title,
  onSave,
  onRename,
  getExportData,
  borderWidth,
  onBorderChange,
}) {
  const router = useRouter();
  const [, force] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const fileRef = useRef(null);
  // Rerender on editor state changes so Undo/Redo disabled states stay fresh.
  useEffect(() => {
    if (!editor) return;
    const rerender = () => force((x) => x + 1);
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    editor.on("update", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
      editor.off("update", rerender);
    };
  }, [editor]);
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;
  const createDoc = async () => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document", templateId: "blank" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/documents/${data.document.id}`);
        return;
      }
      throw new Error("api failed");
    } catch {
      const local = createLocalDocument("Untitled document", "blank");
      router.push(`/documents/${local.id}`);
    }
  };
  const removeDoc = async () => {
    const confirmed = window.confirm("Delete this document? This cannot be undone.");
    if (!confirmed) return;
    deleteLocalDocument(documentId);
    try {
      await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    } catch {
      // local-only copy already removed
    }
    router.push("/documents");
  };
  const doDownload = (format) => {
    if (getExportData) {
      const data = getExportData();
      if (data) {
        downloadData(data, title, format);
        return;
      }
    }
    downloadDocument(editor, title, format);
  };
  const applyStyle = (v) => {
    if (!editor) return;
    if (v === "p") editor.chain().focus().setParagraph().run();
    else
      editor
        .chain()
        .focus()
        .setHeading({ level: Number(v.slice(1)) })
        .run();
  };
  const insertImageUrl = () => {
    if (!imageUrl.trim() || !editor) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl("");
    setImageOpen(false);
  };
  const uploadImage = (file) => {
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <Menubar aria-label="Document menu" className="h-8 border-0 bg-transparent p-0 shadow-none">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onSave} disabled={!editor}>
              Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger disabled={!editor}>Download</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={() => doDownload("pdf")}>PDF document (.pdf)</MenubarItem>
                <MenubarItem onClick={() => doDownload("html")}>Web page (.html)</MenubarItem>
                <MenubarItem onClick={() => doDownload("txt")}>Plain text (.txt)</MenubarItem>
                <MenubarItem onClick={() => doDownload("json")}>JSON (.json)</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem onClick={createDoc}>New document</MenubarItem>
            <MenubarItem onClick={onRename}>Rename</MenubarItem>
            <MenubarItem variant="destructive" onClick={removeDoc}>
              Delete
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => window.print()}>
              Print <MenubarShortcut>Ctrl+P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => editor?.chain().focus().undo().run()} disabled={!canUndo}>
              Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => editor?.chain().focus().redo().run()} disabled={!canRedo}>
              Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Insert</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={!editor}
            >
              Table
            </MenubarItem>
            <MenubarItem onClick={() => setImageOpen(true)} disabled={!editor}>
              Image from URL…
            </MenubarItem>
            <MenubarItem onClick={() => fileRef.current?.click()} disabled={!editor}>
              Upload image…
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Format</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger disabled={!editor}>Text</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={() => applyStyle("p")}>Normal text</MenubarItem>
                <MenubarItem onClick={() => applyStyle("h1")}>Heading 1</MenubarItem>
                <MenubarItem onClick={() => applyStyle("h2")}>Heading 2</MenubarItem>
                <MenubarItem onClick={() => applyStyle("h3")}>Heading 3</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
            >
              Bold <MenubarShortcut>Ctrl+B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor}
            >
              Italic <MenubarShortcut>Ctrl+I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={!editor}
            >
              Underline <MenubarShortcut>Ctrl+U</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Page border</MenubarSubTrigger>
              <MenubarSubContent>
                {[0, 1, 2, 3, 5, 8].map((w) => (
                  <MenubarItem key={w} onClick={() => onBorderChange?.(w)}>
                    {w === 0 ? "None" : `${w}px`}
                    {w === (borderWidth ?? 0) ? " ✓" : ""}
                  </MenubarItem>
                ))}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarItem
              onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
              disabled={!editor}
            >
              Clear formatting
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          uploadImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>Paste an image URL to insert it.</DialogDescription>
          </DialogHeader>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… .png / .jpg"
            aria-label="Image URL"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertImageUrl();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertImageUrl} disabled={!imageUrl.trim()}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
