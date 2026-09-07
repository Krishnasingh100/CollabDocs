import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sync";
import { listUserDocuments } from "@/lib/documents/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DocumentCard } from "@/components/documents/document-card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const documents = await listUserDocuments(user.id);

  return (
    <div className="flex h-screen">
      <Sidebar user={user} />

      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="font-heading text-2xl font-medium text-foreground">
          My documents
        </h1>

        {documents.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="mt-4 font-heading text-lg font-medium">
              No documents yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first document to start writing, alone or with your team.
            </p>
           <Button className="mt-5" render={<Link href="/document/new" />} nativeButton={false}>
  Create document
</Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                updatedAt={doc.updated_at}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}