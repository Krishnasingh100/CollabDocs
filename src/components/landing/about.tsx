import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutTemplate, NotebookPen, Printer } from "lucide-react";

const items = [
  {
    icon: NotebookPen,
    chip: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
    title: "Personal workspace",
    detail: "Private documents for one account. Create, edit, and organize without sharing.",
  },
  {
    icon: LayoutTemplate,
    chip: "bg-amber-600/10 text-amber-800 dark:text-amber-200",
    title: "Template gallery",
    detail: "Start from a report, meeting notes, resume, letter, or proposal — or a blank page.",
  },
  {
    icon: Printer,
    chip: "bg-teal-700/10 text-teal-900 dark:text-teal-200",
    title: "Export and print",
    detail: "Download as PDF, HTML, text, or JSON, or print clean pages.",
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
        CollabDocs is a personal document editor. Sign-in uses Neon Auth, the
        editor uses Tiptap, and documents are stored on Neon Postgres.
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
