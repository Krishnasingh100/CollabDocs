import { redirect, notFound } from "next/navigation";
import { DocumentView } from "./document-view";
import { isAuthConfigured, requireSession } from "@/lib/auth/require-user";

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
  return <DocumentView documentId={id} />;
}
