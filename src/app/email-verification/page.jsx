import { AuthView } from "@neondatabase/auth/react/ui";
export default function EmailVerificationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <AuthView view="EMAIL_VERIFICATION" />
    </main>
  );
}
