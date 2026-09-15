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
          Personal first, organizations next
        </Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          Documents your team <span className="text-primary">edits together</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          CollabDocs is a document editor with personal workspaces today and shared
          organization workspaces next. Real-time editing, comments, and read-write
          permissions included.
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
            <span className="ml-auto flex -space-x-1.5">
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-emerald-600/85 text-[10px] font-semibold text-white">
                A
              </span>
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-amber-600/85 text-[10px] font-semibold text-white">
                J
              </span>
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-teal-700/85 text-[10px] font-semibold text-white">
                R
              </span>
            </span>
          </div>
          <p className="pt-3 text-sm leading-7 text-muted-foreground">
            <span className="rounded bg-emerald-600/10 px-1 font-medium text-emerald-800 dark:text-emerald-200">
              Anna is editing
            </span>{" "}
            the launch checklist while{" "}
            <span className="rounded bg-amber-600/10 px-1 font-medium text-amber-800 dark:text-amber-200">
              Jon comments
            </span>{" "}
            on permissions and{" "}
            <span className="rounded bg-teal-700/10 px-1 font-medium text-teal-900 dark:text-teal-200">
              Ria reviews
            </span>{" "}
            — all in one place.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Authentication by Clerk, editing by Tiptap, real-time by Liveblocks.
        </p>
      </div>
    </section>
  );
}
