import { Loader2 } from "lucide-react";

// Instant dashboard skeleton while the client document list fetches.
export default function DocumentsLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-4 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mx-auto h-12 w-full max-w-xl animate-pulse rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading documents…
      </div>
    </div>
  );
}
