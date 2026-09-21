import Link from "next/link";
export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>CollabDocs. Personal docs now, teamwork next.</p>
        <div className="flex items-center gap-4">
          <Link href="#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="#users" className="hover:text-foreground">
            Users
          </Link>
          <Link href="#about" className="hover:text-foreground">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
