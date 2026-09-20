import type { Editor } from "@tiptap/react";

export type DownloadFormat = "json" | "html" | "txt" | "pdf";

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]+/gi, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug || "untitled-document";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadDocument(
  editor: Editor | null,
  title: string,
  format: DownloadFormat,
) {
  if (!editor || typeof window === "undefined" || typeof document === "undefined")
    return;
  const name = slugifyTitle(title);

  // No lightweight client PDF writer here; reuse the print stylesheet
  // (page only, no chrome) so the user picks "Save as PDF".
  if (format === "pdf") {
    const prev = document.title;
    document.title = name;
    const restore = () => {
      document.title = prev;
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.setTimeout(restore, 2000);
    window.print();
    return;
  }

  let content: string;
  let mime: string;
  let ext: string;
  switch (format) {
    case "json":
      content = JSON.stringify(editor.getJSON(), null, 2);
      mime = "application/json";
      ext = "json";
      break;
    case "html":
      content = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(title.trim() || "Untitled document")}</title>\n</head>\n<body>\n${editor.getHTML()}\n</body>\n</html>\n`;
      mime = "text/html";
      ext = "html";
      break;
    case "txt":
      content = editor.getText();
      mime = "text/plain";
      ext = "txt";
      break;
  }

  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
