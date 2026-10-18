"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Briefcase,
  Check,
  ClipboardList,
  FileText,
  FileUp,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  UserRound,
  X,
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
import {
  createLocalDocument,
  deleteLocalDocument,
  listLocalDocuments,
  saveLocalDocument,
} from "@/lib/documents";
import { TEMPLATES } from "@/components/documents/templates";
import { TemplateThumbnail } from "@/components/documents/template-thumbnail";
import { AccountMenu } from "@/components/auth/account-menu";
import { OrganizationPanel } from "@/components/auth/organization-panel";
import { WORKSPACE_CHANGED_EVENT, WorkspaceSwitcher } from "@/components/auth/workspace-switcher";
import { authClient } from "@/lib/auth/client";
import { FILE_ACCEPT, SUPPORTED_LABEL, parseFileToDocument } from "@/lib/file-open";
import {
  NotificationBell,
  dashRoomIdFor,
  sendOrgNotification,
} from "@/components/notifications/notification-bell";
import { InboxRoomProvider } from "@/components/editor/live-room";
function formatDate(value) {
  if (!value) return "—";
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
// Takes no props, manages workspace docs list with search and templates. Returns dashboard UI.
export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);
  const fileRef = useRef(null);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [createError, setCreateError] = useState(null);
  const { data: session } = authClient.useSession();
  const user = session?.user ?? null;
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const activeOrg = activeOrganization ?? null;
  const activeOrgId = activeOrg?.id ?? null;
  // Liveblocks (inbox room, notification bell) is an organization feature:
  // personal-only accounts never connect to a room, keeping the layers separate.
  const { data: organizations } = authClient.useListOrganizations();
  const hasOrganizations = Array.isArray(organizations) && organizations.length > 0;
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
  // Refetch whenever the active workspace changes: the workspace switcher
  // updates activeOrganizationId through the auth client (and fires the event
  // for immediate refresh), and the dependency re-runs for the new scope.
  useEffect(() => {
    void refresh();
    const onWorkspaceChanged = () => {
      void refresh();
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChanged);
    return () => {
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.plainText.toLowerCase().includes(q),
    );
  }, [docs, deferredQuery]);
  const createFromTemplate = async (t) => {
    setCreating(true);
    setCreateError(null);
    // Hanging API calls used to freeze every gallery button with no feedback.
    // Aborts into the local fallback so a click always opens something.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title: t.title,
          content: t.content,
          plainText: t.plainText,
          templateId: t.id,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        notifyOrgOfNewDocument(data.document, t.title);
        router.push(`/documents/${data.document.id}`);
        return;
      }
      throw new Error("api failed");
    } catch {
      clearTimeout(timer);
      try {
        const local = createLocalDocument(t.title, t.id);
        if (t.content) {
          saveLocalDocument({ ...local, content: t.content, plainText: t.plainText });
        }
        router.push(`/documents/${local.id}`);
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Could not create document.");
      }
    } finally {
      setCreating(false);
    }
  };
  const openPickedFile = async (file) => {
    if (!file || opening) return;    setOpening(true);
    setOpenError(null);
    try {
      const parsed = await parseFileToDocument(file);
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: parsed.title,
            content: parsed.content,
            plainText: parsed.plainText,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          notifyOrgOfNewDocument(data.document, parsed.title);
          router.push(`/documents/${data.document.id}`);
          return;
        }
        throw new Error("api failed");
      } catch {
        const local = createLocalDocument(parsed.title);
        saveLocalDocument({ ...local, content: parsed.content, plainText: parsed.plainText });
        router.push(`/documents/${local.id}`);
      }
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Could not open file.");
    } finally {
      setOpening(false);
    }
  };
  // Announces a newly created org document to the other org members.
  // Member ids come from the auth client (org profile) and the endpoint
  // verifies the caller is that org's active member before sending.
  const notifyOrgOfNewDocument = (document, title) => {
    if (!activeOrg || !document?.id) return;
    const targets = (activeOrg.members ?? [])
      .map((m) => m?.userId ?? m?.user?.id)
      .filter(Boolean)
      .filter((id) => id !== user?.id);
    if (targets.length === 0) return;
    void sendOrgNotification({
      kind: "$orgDocumentCreated",
      orgId: activeOrg.id,
      orgName: activeOrg.name,
      documentId: document.id,
      documentTitle: title || document.title,
      targets,
    });
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
  const saveDoc = (doc) => {    const text = doc.plainText || "";
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
  // Shares by copying link; viewer still needs workspace access for this doc.
  // Personal links work for creator only, org links for every org member.
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
  if (!user) return null;

  return (
    <InboxRoomProvider roomId={hasOrganizations ? dashRoomIdFor(user.id) : null}>
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            href={user ? "/documents" : "/"}
            className="flex shrink-0 items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden text-xl min-[420px]:inline">CollabDocs</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
            <div className="w-32 sm:w-44">
              <WorkspaceSwitcher />
            </div>
            <OrganizationPanel />
          </div>
          {hasOrganizations && <NotificationBell />}
          <AccountMenu />
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="h-12 rounded-full pr-10 pl-11 text-base shadow-sm"
              aria-label="Search documents"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                title="Clear search"
                aria-label="Clear search"
                className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <section aria-label="Template gallery" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Start a new document</h2>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={creating || opening}
                title={`Open ${SUPPORTED_LABEL}, even Google Docs exports`}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <FileUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {opening ? "Opening…" : "Open"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                  <FileUp />
                  <span>Open from this device</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const blank = TEMPLATES.find((t) => t.id === "blank");
                    if (blank) void createFromTemplate(blank);
                  }}
                >
                  <Plus />
                  <span>New blank document</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    document
                      .querySelector('[aria-label="Template gallery"]')
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <FileText />
                  <span>Pick from templates</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {openError && (
            <p role="alert" className="text-sm text-destructive">
              {openError}
            </p>
          )}
          {createError && (
            <p role="alert" className="text-sm text-destructive">
              {createError} — tell support what you clicked.
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={FILE_ACCEPT}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              openPickedFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TEMPLATES.map((t, i) => {
              const Icon = TEMPLATE_ICONS[t.id] ?? FileText;
              return (
                <button
                  key={t.id}
                  onClick={() => createFromTemplate(t)}
                  disabled={creating}
                  title={t.tagline}
                  className="group flex flex-col gap-2 rounded-xl p-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/60 disabled:opacity-60"
                >
                  <TemplateThumbnail template={t} priority={i < 2} />
                  <span className="flex flex-col px-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium group-hover:underline">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{t.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Recent documents" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">Recent documents</h2>
            {!loading && filtered.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {filtered.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading documents…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {query
                ? "No matches."
                : activeOrg
                  ? `No documents in ${activeOrg.name} yet — pick a template or open a file above.`
                  : "No documents yet — pick a template or open a file above."}
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
                        {d.orgId
                          ? activeOrg && d.orgId === activeOrg.id
                            ? activeOrg.name
                            : "Organization"
                          : "Only you"}
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
    </InboxRoomProvider>
  );
}
