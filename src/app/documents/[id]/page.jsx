import { redirect, notFound } from "next/navigation";
import { DocumentView } from "./document-view";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { isAuthConfigured, requireSession, resolveWorkspace } from "@/lib/auth/require-user";
import { workspaceCondition } from "@/lib/documents-access";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const short = typeof id === "string" ? id.slice(0, 8) : "doc";
  return {
    title: `Document ${short} — CollabDocs`,
    description: "Edit your document with CollabDocs editor.",
  };
}

export default async function DocumentPage({ params }) {
  const { id } = await params;
  // Reject non-UUID ids before any DB or Liveblocks work (injection-safe,
  // matches Drizzle defaultRandom ids and the liveblocks-auth room gate).
  if (typeof id !== "string" || !UUID_RE.test(id)) notFound();
  // Defense in depth: proxy.js already redirects, but direct route hits
  // without a session get a clean redirect instead of an empty editor shell.
  if (isAuthConfigured()) {
    const session = await requireSession();
    if (!session?.user) redirect("/sign-in");
  }
  // Resolve the workspace scope once on the server: org documents get the
  // live collaboration room, personal documents stay room-free end to end.
  // A lookup failure keeps the page usable (the editor falls back to its API).
  let orgId = null;
  try {
    const workspace = await resolveWorkspace();
    if (workspace) {
      const rows = await db
        .select({ orgId: documentsTable.orgId })
        .from(documentsTable)
        .where(workspaceCondition(workspace, id))
        .limit(1);
      if (rows[0]) orgId = rows[0].orgId ?? null;
    }
  } catch {
    orgId = null;
  }
  return <DocumentView documentId={id} orgId={orgId} />;
}
