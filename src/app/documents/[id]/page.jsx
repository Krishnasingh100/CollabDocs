import { DocumentEditor } from "@/components/editor/document-editor";
export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Document ${id.slice(0, 8)} — CollabDocs`,
    description: "Edit your document with a Google-Docs-style editor.",
  };
}
export default async function DocumentPage({ params }) {
  const { id } = await params;
  return <DocumentEditor documentId={id} />;
}
