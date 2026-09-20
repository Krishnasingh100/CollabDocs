import type { JSONContent } from "@tiptap/core";

export type TipTapDoc = JSONContent;

export type DocumentSummary = {
  id: string;
  title: string;
  plainText: string;
  templateId?: string | null;
  updatedAt: string;
  createdAt: string;
};

export type DocumentDetail = DocumentSummary & {
  content: TipTapDoc | null;
};

const STORAGE_KEY = "collabdocs:documents:v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStore(): DocumentDetail[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DocumentDetail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(docs: DocumentDetail[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // storage full / private mode — editor still works in-memory
  }
}

export function newLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function listLocalDocuments(): DocumentDetail[] {
  return readStore().sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
}

export function getLocalDocument(id: string): DocumentDetail | null {
  return readStore().find((d) => d.id === id) ?? null;
}

export function saveLocalDocument(doc: DocumentDetail) {
  const docs = readStore();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  writeStore(docs);
}

export function deleteLocalDocument(id: string) {
  writeStore(readStore().filter((d) => d.id !== id));
}

export function createLocalDocument(
  title = "Untitled document",
  templateId: string | null = null,
): DocumentDetail {
  const now = new Date().toISOString();
  const doc: DocumentDetail = {
    id: newLocalId(),
    title,
    content: null,
    plainText: "",
    templateId,
    createdAt: now,
    updatedAt: now,
  };
  saveLocalDocument(doc);
  return doc;
}
