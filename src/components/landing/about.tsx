import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, KeyRound, NotebookPen } from "lucide-react";

const items = [
  {
    icon: NotebookPen,
    chip: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
    title: "Personal workspace",
    detail: "Private documents for one account. Create, edit, and organize without sharing.",
  },
  {
    icon: Building2,
    chip: "bg-amber-600/10 text-amber-800 dark:text-amber-200",
    title: "Organization workspace",
    detail: "Many people work in the same document at once with live presence and updates.",
  },
  {
    icon: KeyRound,
    chip: "bg-teal-700/10 text-teal-900 dark:text-teal-200",
    title: "Comments and permissions",
    detail: "Comment on any section. Owners grant read or write access per document.",
  },
];

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="border-t bg-accent/35 scroll-mt-16"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <p className="text-sm font-medium text-primary">ABOUT</p>
      <h2 id="about-heading" className="mt-2 text-3xl font-semibold tracking-tight">
        About CollabDocs
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        CollabDocs starts with a personal document editor, then adds organization collaboration.
        Authentication uses Clerk, the editor uses Tiptap, and real-time communication uses
        Liveblocks.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="transition-colors hover:border-primary/30">
            <CardHeader>
              <span
                className={`mb-3 flex size-9 items-center justify-center rounded-lg ${item.chip}`}
              >
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      </div>
    </section>
  );
}
