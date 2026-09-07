import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sync";
import { createDocument } from "@/lib/documents/queries";

export default async function NewDocumentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const document = await createDocument(user.id, "Untitled document");
  redirect(`/document/${document.id}`);
}