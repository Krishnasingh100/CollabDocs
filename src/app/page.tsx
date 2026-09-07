import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Users, MessageSquare, History, Share2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/sync";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "See everyone's cursor, live",
    description:
      "Colored cursors and selections show exactly where your teammates are working, so two people never overwrite the same line by accident.",
  },
  {
    icon: MessageSquare,
    title: "Comment right on the text",
    description:
      "Leave feedback anchored to a sentence or paragraph. Reply in threads, resolve when it's handled, and keep the document itself clean.",
  },
  {
    icon: History,
    title: "Every version, remembered",
    description:
      "Roll back to an earlier draft, or see who changed what and when — without asking anyone to explain themselves.",
  },
  {
    icon: Share2,
    title: "Share on your terms",
    description:
      "Invite people by email with viewer, commenter, or editor access, or send a link and let anyone with it jump straight in.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-[13px] font-semibold text-background">
              C
            </span>
            <span className="font-heading text-lg font-medium tracking-tight">
              CollabDocs
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/sign-in" />}
              nativeButton={false}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              render={<Link href="/sign-up" />}
              nativeButton={false}
            >
              Get started
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
          <h1 className="text-balance font-heading text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">
            Write together, without stepping on each other's sentences.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            CollabDocs is where your team drafts, edits, and reviews documents
            at the same time — every cursor, comment, and change visible the
            moment it happens.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              render={<Link href="/sign-up" />}
              nativeButton={false}
            >
              Start writing free
            </Button>
            <Button
              size="lg"
              variant="ghost"
              render={<Link href="#features" />}
              nativeButton={false}
            >
              See how it works
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="max-w-md font-heading text-3xl font-medium tracking-tight">
              Everything a document needs to be a shared workspace.
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4 border-t border-border pt-6">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <div>
                    <h3 className="font-heading text-lg font-medium">{title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="max-w-md font-heading text-2xl font-medium tracking-tight text-background">
              Bring your team into the same document today.
            </h2>
            <Button
              size="lg"
              render={<Link href="/sign-up" />}
              nativeButton={false}
            >
              Create your first document
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-background/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CollabDocs.</p>
          <div className="flex gap-6">
            <Link href="/sign-in" className="hover:text-background">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-background">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}