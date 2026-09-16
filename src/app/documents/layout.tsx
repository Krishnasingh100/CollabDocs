import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <DocumentsSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
