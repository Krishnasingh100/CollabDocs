import { Loader2 } from "lucide-react";

// Route skeleton: paints instantly while the heavy paginated editor bundle
// (TipTap + Liveblocks) loads on the client. Matches the editor shell layout
// so there is no layout shift when DocumentEditor hydrates.
export default function DocumentLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fa]">
      <div className="h-20 border-b border-[#dadce0] bg-white" />
      <div className="flex flex-1 items-start justify-center px-4 py-6">
        <div className="flex min-h-[1056px] w-full max-w-[816px] items-center justify-center gap-2 bg-white text-sm text-muted-foreground shadow">
          <Loader2 className="size-4 animate-spin" /> Loading document…
        </div>
      </div>
    </div>
  );
}
