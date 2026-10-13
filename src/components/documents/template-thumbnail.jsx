import { Plus } from "lucide-react";
import Image from "next/image";

// Takes template and priority flag, renders full SVG artwork. Returns thumbnail UI.
export function TemplateThumbnail({ template, priority = false }) {
  if (!template.banner) {
    return (
      <span
        aria-hidden="true"
        className="flex aspect-[400/517] items-center justify-center rounded-lg border border-border bg-white shadow-sm transition group-hover:border-primary group-hover:shadow-md"
      >
        <Plus className="size-12 text-muted-foreground" strokeWidth={1.25} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="relative aspect-[400/517] overflow-hidden rounded-lg border border-border bg-white shadow-sm transition group-hover:border-primary group-hover:shadow-md"
    >
      <Image
        src={template.banner}
        alt={`${template.name} preview`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 30vw, 180px"
        className="object-contain"
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        unoptimized
      />
    </span>
  );
}
