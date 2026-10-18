import { SignInForm } from "./sign-in-form";
export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const verified = params?.verified === "1";
  const initialEmail = typeof params?.email === "string" ? params.email : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <SignInForm verified={verified} initialEmail={initialEmail} />
    </main>
  );
}
