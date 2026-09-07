import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sync";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="font-heading text-2xl font-medium text-foreground">
        Welcome, {user.name ?? user.email}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your internal user ID: {user.id}
      </p>
      <p className="text-sm text-muted-foreground">
        Auth user ID: {user.auth_user_id}
      </p>
      <p className="text-sm text-muted-foreground">
        Email: {user.email}
      </p>
    </div>
  );
}