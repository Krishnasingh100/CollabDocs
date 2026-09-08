import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canRead } from "@/lib/permissions/check";
import { getDocumentById } from "@/lib/documents/queries";
import { DocumentShell } from "@/components/documents/document-shell";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const role = await getDocumentAccess(id, user.id);
  if (!canRead(role)) notFound();

  const document = await getDocumentById(id);

  return (
    <DocumentShell
      documentId={id}
      title={document.title}
      initialContent={document.content ?? ""}
      role={role}
      currentUserId={user.id}
    />
  );
}