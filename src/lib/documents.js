const STORAGE_KEY = "collabdocs:documents:v1";
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}
function readStore() {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeStore(docs) {
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
export function listLocalDocuments() {
  return readStore().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}
export function getLocalDocument(id) {
  return readStore().find((d) => d.id === id) ?? null;
}
export function saveLocalDocument(doc) {
  const docs = readStore();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  writeStore(docs);
}
export function deleteLocalDocument(id) {
  writeStore(readStore().filter((d) => d.id !== id));
}
export function createLocalDocument(title = "Untitled document", templateId = null) {
  const now = new Date().toISOString();
  const doc = {
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
