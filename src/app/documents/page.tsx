"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
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
  saveLocalDocument,
  type DocumentDetail,
  type DocumentSummary,
} from "@/lib/documents";
import { TEMPLATES, type DocumentTemplate } from "@/components/documents/templates";
import { TemplateThumbnail } from "@/components/documents/template-thumbnail";
import { AccountMenu } from "@/components/auth/account-menu";

const TEMPLATE_ICONS = {
  blank: Plus,
  report: BarChart3,
  "meeting-notes": ClipboardList,
  resume: UserRound,
  letter: Mail,
  proposal: Briefcase,
} as const;

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

  const createFromTemplate = async (t: DocumentTemplate) => {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.title,
          content: t.content,
          plainText: t.plainText,
          templateId: t.id,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { document: DocumentDetail };
        router.push(`/documents/${data.document.id}`);
        return;
      }
      throw new Error("api failed");
    } catch {
      const local = createLocalDocument(t.title, t.id);
      if (t.content) {
        saveLocalDocument({ ...local, content: t.content, plainText: t.plainText });
      }
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
          <AccountMenu />
        </div>
      </div>

      <section aria-label="Template gallery" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Start a new document
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICONS[t.id as keyof typeof TEMPLATE_ICONS] ?? FileText;
            return (
              <button
                key={t.id}
                onClick={() => createFromTemplate(t)}
                disabled={creating}
                title={t.tagline}
                className="group flex flex-col gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <TemplateThumbnail template={t} />
                <span className="flex items-center gap-1.5 px-0.5 text-sm font-medium group-hover:underline">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{t.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Recent documents" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent documents
        </h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading documents…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query ? "No matches." : "No documents yet — pick a template above."}
          </p>
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
      </section>
    </div>
  );
}
