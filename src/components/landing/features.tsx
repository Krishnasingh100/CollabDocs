import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutTemplate, PenLine, ShieldCheck } from "lucide-react";

const items = [
  {
    icon: PenLine,
    chip: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
    title: "Rich text editor",
    detail: "Headings, tables, images, lists, and formatting with Tiptap. Fast and familiar.",
  },
  {
    icon: LayoutTemplate,
    chip: "bg-amber-600/10 text-amber-800 dark:text-amber-200",
    title: "Starter templates",
    detail: "Reports, notes, resumes, letters, and proposals — each with matching page content.",
  },
  {
    icon: ShieldCheck,
    chip: "bg-teal-700/10 text-teal-900 dark:text-teal-200",
    title: "Secure by default",
    detail: "Sign in with Neon Auth. Documents stay private to your account.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-y bg-secondary/50 scroll-mt-16"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <p className="text-sm font-medium text-primary">FEATURES</p>
        <h2 id="features-heading" className="mt-2 text-3xl font-semibold tracking-tight">
          Everything needed to write
        </h2>
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
