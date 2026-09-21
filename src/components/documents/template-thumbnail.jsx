import { Plus } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
function Line({ className, dark }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-1.5 rounded-full",
        dark ? "bg-foreground/70" : "bg-foreground/15",
        className,
      )}
    />
  );
}
function ReportBody() {
  return (
    <>
      <span aria-hidden="true" className="flex h-10 items-end gap-1">
        <span className="w-full rounded-sm bg-foreground/15" style={{ height: "45%" }} />
        <span className="w-full rounded-sm bg-foreground/25" style={{ height: "70%" }} />
        <span className="w-full rounded-sm bg-foreground/60" style={{ height: "100%" }} />
        <span className="w-full rounded-sm bg-foreground/25" style={{ height: "60%" }} />
      </span>
      <Line className="w-full" />
      <Line className="w-2/3" />
    </>
  );
}
function NotesBody() {
  return (
    <>
      {[true, false, false].map((checked, i) => (
        <span key={i} aria-hidden="true" className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-[4px] border",
              checked ? "border-transparent bg-foreground/60" : "border-foreground/25",
            )}
          />
          <span className="h-1.5 w-full rounded-full bg-foreground/15" />
        </span>
      ))}
      <Line className="w-1/2" />
    </>
  );
}
function ResumeBody() {
  return (
    <>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <span className="size-5 shrink-0 rounded-full bg-foreground/25" />
        <span className="flex w-full flex-col gap-1">
          <span className="h-1.5 w-2/3 rounded-full bg-foreground/60" />
          <span className="h-1 w-1/2 rounded-full bg-foreground/15" />
        </span>
      </span>
      <Line className="w-full" />
      <Line className="w-full" />
      <Line className="w-2/3" />
    </>
  );
}
function LetterBody() {
  return (
    <>
      <span aria-hidden="true" className="flex flex-col items-end gap-1">
        <span className="h-1 w-1/2 rounded-full bg-foreground/15" />
        <span className="h-1 w-1/3 rounded-full bg-foreground/15" />
      </span>
      <Line className="w-1/3" dark />
      <Line className="w-full" />
      <Line className="w-full" />
      <Line className="w-2/3" />
    </>
  );
}
function ProposalBody() {
  return (
    <>
      <span
        aria-hidden="true"
        className="grid grid-cols-3 gap-px overflow-hidden rounded border border-foreground/15"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={cn("h-2.5", i < 3 ? "bg-foreground/25" : "bg-foreground/10")} />
        ))}
      </span>
      <Line className="w-full" />
      <Line className="w-2/3" />
    </>
  );
}
function PreviewBody({ template }) {
  switch (template.preview) {
    case "report":
      return <ReportBody />;
    case "notes":
      return <NotesBody />;
    case "resume":
      return <ResumeBody />;
    case "letter":
      return <LetterBody />;
    case "proposal":
      return <ProposalBody />;
    default:
      return (
        <>
          <Line className="w-3/4" dark />
          <Line className="w-full" />
          <Line className="w-full" />
          <Line className="w-2/3" />
        </>
      );
  }
}
export function TemplateThumbnail({ template, priority = false }) {
  // Blank template: the + icon fills the whole page.
  if (template.preview === "blank") {
    return (
      <span
        aria-hidden="true"
        className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-white shadow-sm transition group-hover:border-primary group-hover:shadow-md"
      >
        <Plus className="size-12 text-muted-foreground" strokeWidth={1.25} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex aspect-[3/4] flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition group-hover:border-primary group-hover:shadow-md"
    >
      {template.banner && (
        <span aria-hidden="true" className="relative h-[42%] w-full shrink-0">
          <Image
            src={template.banner}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 30vw, 180px"
            className="object-cover"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="h-2 w-3/4 rounded-full" style={{ backgroundColor: template.accent }} />
        <PreviewBody template={template} />
      </span>
    </span>
  );
}
