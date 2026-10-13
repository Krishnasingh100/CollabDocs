import { DocumentEditor } from "@/components/editor/document-editor";
import { LiveDocRoom } from "@/components/editor/live-room";
export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Document ${id.slice(0, 8)} — CollabDocs`,
    description: "Edit your document with CollabDocs editor.",
  };
}
export default async function DocumentPage({ params }) {
  const { id } = await params;
  return (
    <LiveDocRoom documentId={id}>
      <DocumentEditor documentId={id} />
    </LiveDocRoom>
  );
}
