// Single source of truth for document geometry and typography.
// Values mirror `.docs-page-wrap .tiptap` in editor.css. Export pipelines
// (HTML, DOCX, print/PDF) must reuse these instead of foreign defaults.
import { DOMSerializer } from "@tiptap/pm/model";

export const DOC_PAGE = {
  widthPx: 816,
  heightPx: 1056,
  padTopPx: 48,
  padBottomPx: 48,
  defaultMarginPx: 56,
};

// 1px at 96 CSS DPI equals 15 twips (1440 twips per inch).
export function pxToTwips(px) {
  return Math.round(Number(px || 0) * 15);
}

// US Letter in twips, matches the 816x1056 screen sheet at 96 DPI.
export const DOCX_PAGE_SIZE = { width: 12240, height: 15840 };

// Font stack matches the application (Inter with websafe fallbacks) so
// standalone exports render with the same metrics where possible.
export const DOC_FONT_FAMILY = 'Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

// Takes side margins in px; returns DOCX section margins in twips.
// Returns Letter page with editor-matching margins.
export function getDocxOptions(margins) {
  const left = Number(margins?.left ?? DOC_PAGE.defaultMarginPx);
  const right = Number(margins?.right ?? DOC_PAGE.defaultMarginPx);
  return {
    orientation: "portrait",
    pageSize: { ...DOCX_PAGE_SIZE },
    margins: {
      top: pxToTwips(DOC_PAGE.padTopPx),
      bottom: pxToTwips(DOC_PAGE.padBottomPx),
      left: pxToTwips(left),
      right: pxToTwips(right),
    },
    font: "Arial",
    fontSize: 22, // 11pt in half-points, matches editor body text
    table: { row: { cantSplit: false } },
    heading: {
      heading1: { fontSize: 52, bold: true },
      heading2: { fontSize: 40, bold: true },
      heading3: { fontSize: 30, bold: true },
    },
  };
}

// Takes no input; returns standalone CSS mirroring editor.css typography.
// Returns the same font sizes, line heights, and block spacing the editor uses.
export function buildExportCSS() {
  return [
    `body.docs-export{font-family:${DOC_FONT_FAMILY};font-size:11pt;line-height:1.5;color:#111;max-width:${DOC_PAGE.widthPx}px;margin:0 auto;padding:${DOC_PAGE.padTopPx}px ${DOC_PAGE.defaultMarginPx}px ${DOC_PAGE.padBottomPx}px;word-wrap:break-word;}`,
    `.docs-export p{margin:0 0 8px;}`,
    `.docs-export h1{font-size:26pt;font-weight:600;line-height:1.2;margin:16px 0 8px;}`,
    `.docs-export h2{font-size:20pt;font-weight:600;line-height:1.2;margin:14px 0 8px;}`,
    `.docs-export h3{font-size:15pt;font-weight:600;line-height:1.3;margin:12px 0 6px;}`,
    `.docs-export h4,.docs-export h5,.docs-export h6{font-weight:600;line-height:1.3;margin:10px 0 6px;}`,
    `.docs-export a{color:#1155cc;text-decoration:underline;}`,
    `.docs-export blockquote{border-left:3px solid #dadce0;margin:12px 0;padding:4px 0 4px 16px;color:#444;font-style:italic;}`,
    `.docs-export code{background:#f1f3f4;border-radius:4px;padding:1px 5px;font-size:0.9em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}`,
    `.docs-export pre{background:#202124;color:#e8eaed;border-radius:8px;padding:14px 16px;overflow-x:auto;margin:12px 0;}`,
    `.docs-export pre code{background:transparent;color:inherit;padding:0;}`,
    `.docs-export ul,.docs-export ol{padding-left:28px;margin:8px 0;}`,
    `.docs-export ul{list-style:disc;}`,
    `.docs-export ol{list-style:decimal;}`,
    `.docs-export li{margin:3px 0;}`,
    `.docs-export li>p{margin:0;}`,
    `.docs-export ul[data-type="taskList"]{list-style:none;padding-left:4px;}`,
    `.docs-export hr{border:none;border-top:1px solid #dadce0;margin:20px 0;}`,
    `.docs-export img{max-width:100%;height:auto;border-radius:4px;}`,
    `.docs-export table{border-collapse:collapse;width:100%;margin:12px 0;table-layout:fixed;}`,
    `.docs-export th,.docs-export td{border:1px solid #dadce0;padding:8px 10px;vertical-align:top;min-width:60px;}`,
    `.docs-export th{background:#f1f3f4;font-weight:600;text-align:left;}`,
  ].join("\n");
}

// Takes page count plus per-page block counts; returns a settle signature.
// Returns a short string identifying block distribution across pages.
export function buildSettleSignature(pageCount, childCounts) {
  return `${Number(pageCount) || 0}:${childCounts.join(",")}`;
}
// Takes recent signatures plus a new one; detects pagination oscillation.
// Returns true when the distribution repeats, meaning further chained runs
// only bounce the same blocks without converging.
export function isSettleCycle(recent, sig) {
  return Array.isArray(recent) && recent.includes(sig);
}
// Takes export HTML plus a site origin; absolutizes root-relative asset
// paths so downloaded files resolve images outside the application.
// Returns HTML with absolute URLs.
export function absolutizeExportUrls(html, origin) {
  if (!html || !origin) return html || "";
  return String(html).replace(
    /((?:src|href)=["'])(\/(?!\/)[^"']*["'])/g,
    `$1${String(origin).replace(/\/$/, "")}$2`,
  );
}

// Takes a ProseMirror JSON doc plus a Tiptap schema; serializes the logical
// document in one pass. Paginated editors split textblocks across sheets,
// so concatenating per-page HTML would export one paragraph as two.
// Takes an optional DOM document (tests pass a linkedom document).
// Returns clean HTML without pagination artifacts.
export function serializeDocJsonToHtml(docJson, schema, domDocument) {
  const content = docJson && Array.isArray(docJson.content) ? docJson.content : [];
  if (content.length === 0) return "<p></p>";
  const doc = domDocument ?? (typeof document !== "undefined" ? document : null);
  if (!doc) throw new Error("serializeDocJsonToHtml needs a DOM document");
  const node = schema.nodeFromJSON({ type: "doc", content });
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(node.content, {
    document: doc,
  });
  const wrapper = doc.createElement("div");
  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}
