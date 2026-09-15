import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, User, UsersRound } from "lucide-react";

const items = [
  {
    icon: User,
    chip: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
    title: "Individuals",
    detail: "Private personal workspace. Draft docs before sharing with anyone.",
  },
  {
    icon: UsersRound,
    chip: "bg-amber-600/10 text-amber-800 dark:text-amber-200",
    title: "Teams",
    detail: "Shared organization workspace. Comment on any section and resolve fast.",
  },
  {
    icon: Crown,
    chip: "bg-teal-700/10 text-teal-900 dark:text-teal-200",
    title: "Owners",
    detail: "Grant read or write per document. Keep sensitive docs private.",
  },
];

export function Users() {
  return (
    <section
      id="users"
      aria-labelledby="users-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-16 px-4 py-16"
    >
      <p className="text-sm font-medium text-primary">USERS</p>
      <h2 id="users-heading" className="mt-2 text-3xl font-semibold tracking-tight">
        Built for personal docs and teamwork
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="transition-colors hover:border-primary/30">
            <CardHeader>
              <span
                className={`mb-3 flex size-9 items-center justify-center rounded-lg ${item.chip}`}
              >
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
