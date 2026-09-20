import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/30" />
        <div className="absolute top-24 -left-24 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/20" />
        <div className="absolute top-32 -right-24 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-900/25" />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center md:py-24">
        <Badge variant="secondary" className="border border-primary/20 bg-secondary">
          <span className="mr-1.5 inline-block size-2 rounded-full bg-primary" />
          Personal docs · Templates · Export
        </Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Your documents, <span className="text-primary">ready to write</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          CollabDocs is a personal document editor with starter templates, a
          clean page view, and one-click export to PDF, HTML, text, or JSON.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/sign-up" />}>
            Get started
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
        </div>
        <div className="mt-4 w-full max-w-2xl rounded-xl border bg-card/90 p-4 text-left shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 border-b pb-3">
            <span className="size-2.5 rounded-full bg-emerald-500/70" />
            <span className="size-2.5 rounded-full bg-amber-500/70" />
            <span className="size-2.5 rounded-full bg-teal-500/70" />
            <span className="ml-2 text-xs text-muted-foreground">Q3 planning doc</span>
          </div>
          <p className="pt-3 text-sm leading-7 text-muted-foreground">
            Start from a template, write on clean pages, and export to PDF —
            all in one place.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Sign-in by Neon Auth, editing by Tiptap, storage on Neon Postgres.
        </p>
      </div>
    </section>
  );
}
