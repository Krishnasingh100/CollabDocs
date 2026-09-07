import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canRead } from "@/lib/permissions/check";
import { getDocumentById } from "@/lib/documents/queries";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

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
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center border-b border-border px-6">
        <h1 className="font-heading text-base font-medium">{document.title}</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <TiptapEditor documentId={id} initialContent={document.content ?? ""} />
      </div>
    </div>
  );
}