"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Briefcase,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  createLocalDocument,
  deleteLocalDocument,
  listLocalDocuments,
  saveLocalDocument,
} from "@/lib/documents";
import { TEMPLATES } from "@/components/documents/templates";
import { TemplateThumbnail } from "@/components/documents/template-thumbnail";
import { AccountMenu } from "@/components/auth/account-menu";
function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
const TEMPLATE_ICONS = {
  blank: Plus,
  report: BarChart3,
  "meeting-notes": ClipboardList,
  resume: UserRound,
  letter: Mail,
  proposal: Briefcase,
};
export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  // Typing stays instant, table filters on the deferred value so each
  // keystroke does not re-render all rows synchronously.
  const deferredQuery = useDeferredValue(query);
  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
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
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.plainText.toLowerCase().includes(q),
    );
  }, [docs, deferredQuery]);
  const createFromTemplate = async (t) => {
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
        const data = await res.json();
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
  const removeDoc = async (id) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    deleteLocalDocument(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
    } catch {
      /* local-only — already removed */
    }
  };
  // Save a .txt copy of the document text to this device.
  const saveDoc = (doc) => {
    const text = doc.plainText || "";
    const blob = new Blob([`${doc.title || "Untitled document"}\n\n${text}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || "untitled"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  // Share = copy the document link. Anyone opening it still needs
  // access to this workspace; real multi-user sharing is not built yet.
  const shareDoc = async (doc) => {
    const url = `${window.location.origin}/documents/${doc.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy document link:", url);
      return;
    }
    setCopiedId(doc.id);
    setTimeout(() => {
      setCopiedId((cur) => (cur === doc.id ? null : cur));
    }, 2000);
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
        <h2 className="text-sm font-medium text-muted-foreground">Start a new document</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TEMPLATES.map((t, i) => {
            const Icon = TEMPLATE_ICONS[t.id] ?? FileText;
            return (
              <button
                key={t.id}
                onClick={() => createFromTemplate(t)}
                disabled={creating}
                title={t.tagline}
                className="group flex flex-col gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <TemplateThumbnail template={t} priority={i < 2} />
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
        <h2 className="text-sm font-medium text-muted-foreground">Recent documents</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading documents…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query ? "No matches." : "No documents yet — pick a template above."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Shared</TableHead>
                  <TableHead>Created at</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/documents/${d.id}`}
                        className="flex max-w-64 items-center gap-2.5 font-medium hover:underline sm:max-w-96"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="size-4" aria-hidden="true" />
                        </span>
                        <span className="truncate">{d.title || "Untitled document"}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      Only you
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${d.title}`}
                          title="Actions"
                          className="flex size-7 items-center justify-center rounded-md outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MoreHorizontal className="size-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => saveDoc(d)}>
                            <Save />
                            <span>Save</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareDoc(d)}>
                            {copiedId === d.id ? <Check /> : <Share2 />}
                            <span>{copiedId === d.id ? "Link copied" : "Share"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => removeDoc(d.id)}>
                            <Trash2 />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
