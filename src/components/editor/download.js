export function slugifyTitle(title) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]+/gi, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug || "untitled-document";
}
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export function downloadDocument(editor, title, format) {
  if (!editor || typeof window === "undefined" || typeof document === "undefined") return;
  downloadData(
    { json: editor.getJSON(), html: editor.getHTML(), text: editor.getText() },
    title,
    format,
  );
}

// Same export as downloadDocument, but for prebuilt whole-document strings
// (the paged editor concatenates all sheets before downloading).
export function downloadData(data, title, format) {
  if (!data || typeof window === "undefined" || typeof document === "undefined") return;
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
  let content;
  let mime;
  let ext;
  switch (format) {
    case "json":
      content = JSON.stringify(data.json, null, 2);
      mime = "application/json";
      ext = "json";
      break;
    case "html":
      content = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(title.trim() || "Untitled document")}</title>\n</head>\n<body>\n${data.html}\n</body>\n</html>\n`;
      mime = "text/html";
      ext = "html";
      break;
    case "txt":
      content = data.text;
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
