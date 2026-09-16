"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  createLocalDocument,
  deleteLocalDocument,
  listLocalDocuments,
  type DocumentDetail,
  type DocumentSummary,
} from "@/lib/documents";

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<(DocumentSummary & { content?: unknown })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { documents: DocumentSummary[] };
        setDocs(data.documents ?? []);
        setLoading(false);
        return;
      }
      throw new Error("api failed");
    } catch {
      setDocs(listLocalDocuments());
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.plainText.toLowerCase().includes(q),
    );
  }, [docs, query]);

  const createDoc = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { document: DocumentDetail };
        router.push(`/documents/${data.document.id}`);
        return;
      }
      throw new Error("api failed");
    } catch {
      const local = createLocalDocument();
      router.push(`/documents/${local.id}`);
    } finally {
      setCreating(false);
    }
  };

  const removeDoc = async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    deleteLocalDocument(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
    } catch {
      /* local-only — already removed */
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <h1 className="text-xl font-semibold">Documents</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents"
              className="w-52 pl-8"
              aria-label="Search documents"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading documents…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </span>
          <div>
            <p className="font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first Google-Docs-style document.
            </p>
          </div>
          <Button onClick={createDoc} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : <Plus />}
            Create document
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.id} className="group flex flex-col gap-2 p-4">
              <Link href={`/documents/${d.id}`} className="flex flex-1 flex-col gap-1.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <span className="truncate font-medium hover:underline">{d.title || "Untitled document"}</span>
                <span className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {d.plainText || "No content yet — click to start writing."}
                </span>
                <span className="text-xs text-muted-foreground">
                  Edited {new Date(d.updatedAt).toLocaleString()}
                </span>
              </Link>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${d.title}`}
                  onClick={() => removeDoc(d.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
