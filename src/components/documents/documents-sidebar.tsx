"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  createLocalDocument,
  deleteLocalDocument,
  listLocalDocuments,
  type DocumentSummary,
} from "@/lib/documents";

export function DocumentsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const activeId = useMemo(() => {
    const m = pathname?.match(/\/documents\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

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
        const data = (await res.json()) as {
          document: DocumentSummary;
        };
        setDocs((prev) => [data.document, ...prev]);
        router.push(`/documents/${data.document.id}`);
        return;
      }
      throw new Error("api failed");
    } catch {
      const local = createLocalDocument();
      setDocs((prev) => [
        {
          id: local.id,
          title: local.title,
          plainText: local.plainText,
          updatedAt: local.updatedAt,
          createdAt: local.createdAt,
        },
        ...prev,
      ]);
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
      /* local-only */
    }
    if (activeId === id) router.push("/documents");
  };

  return (
    <Sidebar>
      {/* Above: brand */}
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 rounded-md px-1 py-1 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          <span>CollabDocs</span>
        </Link>
        <Button onClick={createDoc} disabled={creating} className="w-full justify-start">
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          New document
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="pl-8"
          />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Separated list */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Documents {docs.length > 0 && `· ${filtered.length}`}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">
                {query ? "No matches." : "No documents yet."}
              </div>
            ) : (
              <SidebarMenu>
                {filtered.map((d) => (
                  <SidebarMenuItem key={d.id}>
                    <SidebarMenuButton
                      isActive={activeId === d.id}
                      render={
                        <Link
                          href={`/documents/${d.id}`}
                          title={d.title || "Untitled document"}
                        />
                      }
                    >
                      <FileText />
                      <span>{d.title || "Untitled document"}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Delete ${d.title}`}
                      onClick={() => removeDoc(d.id)}
                    >
                      <Trash2 />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <span className="px-2 text-xs text-muted-foreground">
          Personal workspace
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
