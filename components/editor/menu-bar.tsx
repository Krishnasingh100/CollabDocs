"use client";

import { Editor } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function downloadHTML(editor: Editor, title: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${editor.getHTML()}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "document"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MenuBar({ editor, title }: { editor: Editor; title: string }) {
  function menuButtonClass() {
    return "text-sm text-muted-foreground hover:text-foreground";
  }

  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger className={menuButtonClass()}>File</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadHTML(editor, title)}>
            Download as HTML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={menuButtonClass()}>Edit</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().undo().run()}>
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().redo().run()}>
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().selectAll().run()}
          >
            Select all
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={menuButtonClass()}>Insert</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              const url = window.prompt("Image URL");
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }}
          >
            Image
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            Table
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = window.prompt("Link URL");
              if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }}
          >
            Link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            Horizontal line
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={menuButtonClass()}>Format</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleUnderline().run()}>
            Underline
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
            Normal text
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            Clear formatting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}