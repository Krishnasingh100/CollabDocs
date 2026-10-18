import { OrganizationView } from "@neondatabase/auth/react/ui";
export default async function OrganizationPage({ params }) {
  const { path } = await params;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <OrganizationView path={path} />
    </main>
  );
}
