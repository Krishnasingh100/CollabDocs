import { AccountView } from "@neondatabase/auth/react/ui";
export default async function AccountPage({ params }) {
  const { path } = await params;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <AccountView path={path} />
    </main>
  );
}
