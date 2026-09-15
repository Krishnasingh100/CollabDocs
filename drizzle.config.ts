import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

// `generate` / `check` only read ./src/db/schema.ts and don't touch the
// database, so they must work without DATABASE_URL (offline / CI).
// `push` / `migrate` / `pull` / `studio` need a live Neon database.
const needsLiveDatabase = process.argv.some((arg) =>
  ["push", "migrate", "pull", "studio", "up"].includes(arg),
);

if (needsLiveDatabase && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env (local) or Vercel Project Settings → Environment Variables.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
