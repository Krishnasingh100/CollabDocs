import { VerifyEmailForm } from "./verify-form";
export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const initialEmail = typeof params?.email === "string" ? params.email : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <VerifyEmailForm initialEmail={initialEmail} />
    </main>
  );
}
