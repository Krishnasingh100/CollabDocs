// Open-any-file: parse uploads (PDF, Word, HTML, JSON, Markdown, text,
// Google Docs exports) into TipTap JSON so the editor can edit them.
export const SUPPORTED_LABEL = "PDF, Word (.docx), HTML, JSON, Markdown, text";
export const FILE_ACCEPT = ".pdf,.doc,.docx,.txt,.md,.markdown,.json,.html,.htm,.gdoc";
const MAX_BYTES = 25 * 1024 * 1024;
// Bundled worker (public/pdf.worker.min.mjs, copied from the installed
// pdfjs-dist version). Keep in sync when upgrading pdfjs-dist.
const PDF_WORKER = "/pdf.worker.min.mjs";

function textNode(value, marks) {
  const node = { type: "text", text: value };
  if (marks?.length) {
    node.marks = marks.map((m) => (m.attrs ? { type: m.type, attrs: m.attrs } : { type: m.type }));
  }
  return node;
}
function para(inline, attrs) {
  const node = { type: "paragraph" };
  if (attrs) node.attrs = attrs;
  if (inline?.length) node.content = inline;
  return node;
}
function heading(level, inline, attrs) {
  const node = { type: "heading", attrs: { level, ...attrs } };
  if (inline?.length) node.content = inline;
  return node;
}
function mark(type, attrs) {
  return attrs ? { type, attrs } : { type };
}
// Live style only when attached to the visible document (docx render host);
// detached DOMParser trees and tests fall back to tag + style attribute.
function connectedStyle(el) {
  try {
    if (typeof document !== "undefined" && el?.nodeType === 1 && document.body?.contains(el)) {
      return getComputedStyle(el);
    }
  } catch {
    // no computed style available
  }
  return null;
}
function parseStyleAttr(el) {
  const map = {};
  const raw = typeof el?.getAttribute === "function" ? el.getAttribute("style") : null;
  if (!raw) return map;
  for (const part of raw.split(";")) {
    const i = part.indexOf(":");
    if (i > 0) map[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().toLowerCase();
  }
  return map;
}
const normColor = (v) => String(v ?? "").replace(/\s+/g, "").toLowerCase();
function firstFont(v) {
  const first = String(v ?? "").split(",")[0]?.replace(/["']/g, "").trim();
  return first || "";
}
// Extra marks from color/background/size/family/decoration, compared against
// the parent so inherited values are not stamped on every run. textStyle
// attrs merge into one mark since TipTap allows one textStyle per run.
function styleMarks(el, parentEl, marks) {
  const has = (t) => marks.some((m) => m.type === t);
  const cs = connectedStyle(el);
  const ps = parentEl?.nodeType === 1 ? connectedStyle(parentEl) : null;
  const sa = parseStyleAttr(el);
  const pa = parentEl?.nodeType === 1 ? parseStyleAttr(parentEl) : {};
  const val = (p) => cs?.getPropertyValue(p) || sa[p] || "";
  const pval = (p) => ps?.getPropertyValue(p) || pa[p] || "";
  const extra = [];
  const ts = {};
  const c = normColor(val("color"));
  if (c && !/transparent/.test(c) && c !== normColor(pval("color"))) ts.color = val("color").trim();
  const bg = normColor(val("background-color"));
  if (bg && bg !== "rgba(0,0,0,0)" && bg !== "transparent" && bg !== normColor(pval("background-color"))) {
    if (!has("highlight")) extra.push(mark("highlight", { color: val("background-color").trim() }));
  }
  const fs = val("font-size").trim();
  if (fs && fs !== pval("font-size").trim()) ts.fontSize = fs;
  const ff = firstFont(val("font-family"));
  if (ff && ff.toLowerCase() !== firstFont(pval("font-family")).toLowerCase()) ts.fontFamily = ff;
  if (Object.keys(ts).length && !has("textStyle")) extra.push(mark("textStyle", ts));
  const td = `${val("text-decoration") || ""} ${val("text-decoration-line") || ""}`;
  if (/underline/.test(td) && !has("underline")) extra.push(mark("underline"));
  if (/line-through/.test(td) && !has("strike")) extra.push(mark("strike"));
  const boldNow = /bold/.test(val("font-weight")) || Number.parseInt(val("font-weight")) >= 600;
  const boldWas = /bold/.test(pval("font-weight")) || Number.parseInt(pval("font-weight")) >= 600;
  if (boldNow && !boldWas && !has("bold")) extra.push(mark("bold"));
  if (/italic|oblique/.test(val("font-style")) && !/italic|oblique/.test(pval("font-style")) && !has("italic")) {
    extra.push(mark("italic"));
  }
  return extra;
}
function alignOf(el) {
  const cs = connectedStyle(el);
  const v = String(
    cs?.textAlign || parseStyleAttr(el)["text-align"] || el.getAttribute?.("align") || "",
  ).toLowerCase();
  return v === "center" || v === "right" || v === "justify" ? v : undefined;
}

// Plain lines to blocks; light Markdown: # headings, - / * bullets, 1. ordered.
export function textToBlocks(raw) {
  const blocks = [];
  const bullets = [];
  const ordered = [];
  const flushLists = () => {
    if (bullets.length) {
      blocks.push({
        type: "bulletList",
        content: bullets.splice(0).map((t) => ({ type: "listItem", content: [para([textNode(t)])] })),
      });
    }
    if (ordered.length) {
      blocks.push({
        type: "orderedList",
        content: ordered.splice(0).map((t) => ({ type: "listItem", content: [para([textNode(t)])] })),
      });
    }
  };
  for (const line of String(raw ?? "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      flushLists();
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushLists();
      blocks.push(heading(h[1].length, [textNode(h[2])]));
      continue;
    }
    const b = t.match(/^[-*]\s+(.*)$/);
    if (b) {
      bullets.push(b[1]);
      continue;
    }
    const o = t.match(/^\d+[.)]\s+(.*)$/);
    if (o) {
      ordered.push(o[1]);
      continue;
    }
    flushLists();
    blocks.push(para([textNode(line.trimEnd())]));
  }
  flushLists();
  if (!blocks.length) blocks.push(para());
  return blocks;
}

export function blocksToPlainText(blocks) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n.type === "text") out.push(n.text);
      if (n.type === "hardBreak") out.push("\n");
      if (n.content) walk(n.content);
      if (/^(paragraph|heading|listItem|tableCell|tableHeader|codeBlock|blockquote)$/.test(n.type)) out.push("\n");
    }
  };
  walk(blocks);
  return out.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Inline DOM to TipTap text nodes (marks, colors, sizes, links, images kept).
function inlineChildren(el, marks = [], _parentEl = null) {
  const out = [];
  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      const v = child.nodeValue ?? "";
      if (v) out.push(textNode(v, marks));
    } else if (child.nodeType === 1) {
      const tag = child.tagName.toLowerCase();
      if (tag === "br") {
        out.push({ type: "hardBreak" });
      } else if (tag === "img") {
        const src = child.getAttribute("src") || "";
        if (/^(https?:|data:image\/)/i.test(src)) out.push({ type: "image", attrs: { src } });
      } else if (tag === "style" || tag === "script" || tag === "noscript" || tag === "template") {
        continue;
      } else {
        let next = marks;
        if (tag === "strong" || tag === "b") next = [...marks, mark("bold")];
        else if (tag === "em" || tag === "i") next = [...marks, mark("italic")];
        else if (tag === "u" || tag === "ins") next = [...marks, mark("underline")];
        else if (tag === "s" || tag === "strike" || tag === "del") next = [...marks, mark("strike")];
        else if (tag === "code") next = [...marks, mark("code")];
        else if (tag === "mark" && !marks.some((m) => m.type === "highlight")) {
          next = [...marks, mark("highlight", { color: "#ffff00" })];
        } else if (tag === "a") {
          const href = child.getAttribute("href");
          next = href ? [...marks, mark("link", { href })] : marks;
        }
        next = [...next, ...styleMarks(child, el, next)];
        out.push(...inlineChildren(child, next, el));
      }
    }
  }
  // Merge adjacent text with identical marks; drop whitespace-only runs.
  const merged = [];
  for (const n of out) {
    const prev = merged[merged.length - 1];
    if (
      n.type === "text" &&
      prev?.type === "text" &&
      JSON.stringify(prev.marks ?? null) === JSON.stringify(n.marks ?? null)
    ) {
      prev.text += n.text;
    } else {
      merged.push(n);
    }
  }
  return merged.filter((n) => n.type !== "text" || /\S/.test(n.text));
}

function listBlocks(el, ordered) {
  const items = [];
  for (const li of el.children) {
    if (li.tagName?.toLowerCase() !== "li") continue;
    const content = [];
    let inline = [];
    const flushInline = () => {
      if (inline.length) {
        content.push(para(inline));
        inline = [];
      }
    };
    for (const child of li.childNodes) {
      if (child.nodeType === 3) {
        if (/\S/.test(child.nodeValue ?? "")) inline.push(...inlineChildren({ childNodes: [child] }, [], li));
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          flushInline();
          content.push(...htmlBlocks(child, li));
        } else if (tag === "p" || /^h[1-6]$/.test(tag)) {
          flushInline();
          content.push(...htmlBlocks(child, li));
        } else {
          inline.push(...inlineChildren(child, [], li));
        }
      }
    }
    flushInline();
    if (content.length) items.push({ type: "listItem", content });
  }
  if (!items.length) return [];
  return [{ type: ordered ? "orderedList" : "bulletList", content: items }];
}

function tableBlocks(el) {
  const rows = [];
  const rowEls = el.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr");
  for (const tr of rowEls) {
    const cells = [];
    for (const cell of tr.children) {
      const tag = cell.tagName?.toLowerCase();
      if (tag !== "td" && tag !== "th") continue;
      const inline = inlineChildren(cell, [], cell);
      const align = alignOf(cell);
      cells.push({
        type: tag === "th" ? "tableHeader" : "tableCell",
        content: [para(inline, align ? { textAlign: align } : undefined)],
      });
    }
    if (cells.length) rows.push({ type: "tableRow", content: cells });
  }
  return rows.length ? [{ type: "table", content: rows }] : [];
}

function htmlBlocks(root, parentEl = root?.nodeType === 1 ? root : null) {
  const blocks = [];
  const els = root.nodeType === 11 || root.tagName ? root.childNodes : [];
  for (const child of els) {
    if (child.nodeType === 3) {
      if (/\S/.test(child.nodeValue ?? "")) blocks.push(para([textNode(child.nodeValue.trim())]));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (tag === "style" || tag === "script" || tag === "noscript" || tag === "template") continue;
    if (/^h[1-6]$/.test(tag)) {
      const inline = inlineChildren(child, [], root?.nodeType === 1 ? root : parentEl);
      const align = alignOf(child);
      if (inline.length) blocks.push(heading(Number(tag[1]), inline, align ? { textAlign: align } : undefined));
    } else if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
      const nested = [];
      let hasBlock = false;
      for (const c of child.childNodes) {
        if (c.nodeType === 1 && /^(ul|ol|table|blockquote|pre|h[1-6]|p|div)$/.test(c.tagName.toLowerCase())) {
          hasBlock = true;
          break;
        }
      }
      if (hasBlock) {
        for (const c of child.childNodes) {
          if (c.nodeType === 1) nested.push(...htmlBlocks({ childNodes: [c], nodeType: 11 }, child));
          else if (c.nodeType === 3 && /\S/.test(c.nodeValue ?? "")) nested.push(para([textNode(c.nodeValue.trim())]));
        }
        blocks.push(...nested);
      } else {
        const inline = inlineChildren(child, [], root?.nodeType === 1 ? root : parentEl);
        const align = alignOf(child);
        if (inline.length) blocks.push(para(inline, align ? { textAlign: align } : undefined));
      }
    } else if (tag === "ul") {
      blocks.push(...listBlocks(child, false));
    } else if (tag === "ol") {
      blocks.push(...listBlocks(child, true));
    } else if (tag === "blockquote") {
      const inner = htmlBlocks(child, child);
      if (inner.length) blocks.push({ type: "blockquote", content: inner });
    } else if (tag === "pre") {
      const t = child.textContent ?? "";
      if (/\S/.test(t)) blocks.push({ type: "codeBlock", content: [textNode(t.replace(/\n$/, ""))] });
    } else if (tag === "table") {
      blocks.push(...tableBlocks(child));
    } else if (tag === "hr") {
      blocks.push({ type: "horizontalRule" });
    } else if (tag === "img") {
      const src = child.getAttribute("src") || "";
      if (/^(https?:|data:image\/)/i.test(src)) blocks.push({ type: "image", attrs: { src } });
    } else if (tag === "br") {
      continue;
    } else {
      blocks.push(...htmlBlocks(child, child));
    }
  }
  return blocks;
}

export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  const blocks = htmlBlocks(doc.body);
  return blocks.length ? blocks : [para()];
}

function isPdfBold(fontName) {
  return /bold|black|demi|heavy/i.test(String(fontName ?? ""));
}
function isPdfItalic(fontName) {
  return /italic|oblique/i.test(String(fontName ?? ""));
}
// Raster XObject to JPEG data URL (downscaled, white base). Null when undecodable.
function rasterToDataURL(img) {
  try {
    if (typeof document === "undefined") return null;
    const n = img.width * img.height;
    if (!n || img.width < 8 || img.height < 8) return null;
    if (![2, 3].includes(img.kind) && img.data.length !== n) return null;
    const full = document.createElement("canvas");
    full.width = img.width;
    full.height = img.height;
    const fctx = full.getContext("2d");
    if (!fctx) return null;
    const id = fctx.createImageData(img.width, img.height);
    const src = img.data;
    const dst = id.data;
    if (src.length === n * 4) {
      dst.set(src.subarray(0, n * 4));
    } else if (src.length === n * 3) {
      for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
        dst[j] = src[i];
        dst[j + 1] = src[i + 1];
        dst[j + 2] = src[i + 2];
        dst[j + 3] = 255;
      }
    } else if (src.length === n) {
      for (let i = 0, j = 0; i < src.length; i++, j += 4) {
        dst[j] = dst[j + 1] = dst[j + 2] = src[i];
        dst[j + 3] = 255;
      }
    } else {
      return null;
    }
    fctx.putImageData(id, 0, 0);
    const scale = Math.min(1, 800 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(full, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

// PDF import with layout fidelity: text order, headings by size, bold/italic,
// non-black colors, and embedded images placed where they sit on the page.
async function pdfToBlocks(file) {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const OPS = pdfjs.OPS;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const SHOW = new Set([OPS.showText, OPS.showSpacedText, OPS.nextLineShowText]);
  const blocks = [];
  let imagesLeft = 30;
  const pages = Math.min(pdf.numPages ?? 0, 200);
  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const [tc, ops] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
    // Fill colors tracked per show-text op; used only on exact 1:1 alignment.
    const opColors = [];
    let cur = null;
    const nonBlack = (c) => c && !(c[0] === 0 && c[1] === 0 && c[2] === 0);
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const a = ops.argsArray[i] || [];
      if (fn === OPS.setFillRGBColor) cur = [a[0] * 255, a[1] * 255, a[2] * 255];
      else if (fn === OPS.setFillGray) cur = [a[0] * 255, a[0] * 255, a[0] * 255];
      else if (SHOW.has(fn)) opColors.push(nonBlack(cur) ? cur : null);
    }
    const items = (tc.items ?? []).filter((it) => it.str != null);
    const colors = opColors.length === items.length ? opColors : null;
    // Group items into visual rows by baseline y, ordered top-first with x sort.
    const rows = new Map();
    items.forEach((it, idx) => {
      const y = it.transform?.[5] ?? 0;
      const key = Math.round(y);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ it, idx, x: it.transform?.[4] ?? 0 });
    });
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    const merged = [];
    for (const [y, runs] of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.y - y) <= 2) last.runs.push(...runs);
      else merged.push({ y, runs });
    }
    for (const row of merged) row.runs.sort((a, b) => a.x - b.x);
    const sizes = merged.map((r) => {
      let best = 0;
      let bestLen = 0;
      for (const { it } of r.runs) {
        const len = it.str.length;
        if (len > bestLen) {
          bestLen = len;
          best = it.height || 0;
        }
      }
      return best || 10;
    });
    const median = [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)] || 10;
    // Embedded images with page-space y for interleaving.
    const pics = [];
    if (imagesLeft > 0 && typeof document !== "undefined") {
      let m = [1, 0, 0, 1, 0, 0];
      for (let i = 0; i < ops.fnArray.length && pics.length < imagesLeft; i++) {
        const fn = ops.fnArray[i];
        const a = ops.argsArray[i] || [];
        if (fn === OPS.transform) m = a;
        else if (fn === OPS.paintImageXObject) {
          try {
            const img = page.objs.get(a[0]);
            const src = img ? rasterToDataURL(img) : null;
            if (src) pics.push({ y: m[5] + (Math.abs(m[3]) * (img.height || 0)) / 2, src });
          } catch {
            // undecodable image, text still imports
          }
        }
      }
      imagesLeft -= pics.length;
    }
    // Walk rows top-down with images interleaved; wide gaps break paragraphs.
    const events = [
      ...merged.map((r, i) => ({ y: r.y, row: r, size: sizes[i] })),
      ...pics.map((pic) => ({ y: pic.y, pic })),
    ].sort((a, b) => b.y - a.y);
    let acc = [];
    let prevY = null;
    const flush = () => {
      if (!acc.length) return;
      const inline = [];
      acc.forEach((runs, li) => {
        if (li > 0) inline.push(textNode(" "));
        inline.push(...runs);
      });
      blocks.push(para(inline));
      acc = [];
    };
    for (const ev of events) {
      if (ev.pic) {
        flush();
        prevY = ev.y;
        blocks.push({ type: "image", attrs: { src: ev.pic.src } });
        continue;
      }
      // Large vertical gap starts a new paragraph, like a blank line.
      if (prevY != null && prevY - ev.y > median * 1.6) flush();
      prevY = ev.y;
      const runs = [];
      for (const { it, idx } of ev.row.runs) {
        if (!/\S/.test(it.str)) continue;
        const marks = [];
        if (isPdfBold(it.fontName)) marks.push(mark("bold"));
        if (isPdfItalic(it.fontName)) marks.push(mark("italic"));
        const c = colors?.[idx];
        if (c) {
          marks.push(
            mark("textStyle", {
              color: `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`,
            }),
          );
        }
        runs.push(textNode(it.str, marks));
      }
      if (!runs.length) {
        flush();
        continue;
      }
      const lineText = runs.map((r) => r.text).join("");
      if (ev.size >= median * 1.35 && lineText.trim().length < 160) {
        flush();
        blocks.push(heading(ev.size >= median * 1.8 ? 1 : 2, runs));
      } else {
        acc.push(runs);
      }
    }
    flush();
  }
  try {
    await pdf.destroy?.();
  } catch {
    // cleanup optional; extracted text already collected
  }
  return blocks.length ? blocks : textToBlocks("");
}

function titleOf(file) {
  const name = String(file?.name ?? "").replace(/\.[^.]+$/, "").trim();
  return name || "Untitled document";
}

// Word with full fidelity: render via docx-preview (colors, alignment, sizes,
// tables, images as base64) off-screen, then convert live DOM with computed
// styles. Mammoth fallback for files the renderer rejects.
async function docxToBlocks(buf) {
  try {
    if (typeof document === "undefined") throw new Error("browser only");
    const { renderAsync } = await import("docx-preview");
    const host = document.createElement("div");
    const styles = document.createElement("div");
    const hide = "position:fixed;left:-99999px;top:0;visibility:hidden;";
    host.style.cssText = hide;
    styles.style.cssText = hide;
    document.body.append(host, styles);
    try {
      await renderAsync(buf, host, styles, { useBase64URL: true, breakPages: false });
      const out = htmlBlocks(host, host);
      if (out.length) return out;
      throw new Error("empty render");
    } finally {
      host.remove();
      styles.remove();
    }
  } catch (e) {
    if (e?.message === "browser only") throw new Error("Word open needs the browser.");
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.convertToHtml({ arrayBuffer: buf.slice(0) });
    return htmlToBlocks(result.value || "");
  }
}

// Main entry: File to { title, content, plainText }; throws friendly Error.
export async function parseFileToDocument(file) {
  if (!file) throw new Error("No file picked.");
  if (file.size > MAX_BYTES) throw new Error("File too big — 25 MB max.");
  const ext = String(file.name ?? "").split(".").pop()?.toLowerCase() ?? "";
  const title = titleOf(file);
  if (ext === "gdoc" || ext === "gsheet" || ext === "gslides") {
    throw new Error("Google Docs pointer file — open it in Google Docs, File > Download > Word (.docx), then open that here.");
  }
  if (ext === "doc") {
    throw new Error("Old .doc format — re-save it as .docx in Word or Google Docs, then open that here.");
  }
  let blocks;
  if (ext === "txt" || ext === "md" || ext === "markdown") {
    blocks = textToBlocks(await file.text());
  } else if (ext === "json") {
    const raw = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON file.");
    }
    const inner = parsed?.type === "doc" ? parsed.content : parsed?.content?.content;
    if (Array.isArray(inner) && inner.length) {
      blocks = inner;
    } else if (typeof parsed?.text === "string" && parsed.text.trim()) {
      blocks = textToBlocks(parsed.text);
    } else {
      blocks = textToBlocks(raw);
    }
  } else if (ext === "html" || ext === "htm") {
    blocks = htmlToBlocks(await file.text());
  } else if (ext === "docx") {
    blocks = await docxToBlocks(await file.arrayBuffer());
  } else if (ext === "pdf") {
    blocks = await pdfToBlocks(file);
  } else if (!ext) {
    blocks = textToBlocks(await file.text());
  } else {
    throw new Error(`.${ext} not supported — use ${SUPPORTED_LABEL}.`);
  }
  if (!blocks.length) blocks = [para()];
  const plainText = blocksToPlainText(blocks).slice(0, 20000);
  return { title, content: { type: "doc", content: blocks }, plainText };
}
