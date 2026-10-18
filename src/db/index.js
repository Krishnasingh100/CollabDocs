import "@/lib/network";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
// Uses fetch-based neon-http for Serverless/Edge; missing DATABASE_URL throws only at query time.
// Run migrations via `bun run db:migrate`, never `pg` Pool or migrate-on-boot.
const connectionString = process.env.DATABASE_URL;
function missingDatabaseError() {
  return new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env (local) and to Vercel Project Settings → Environment Variables.",
  );
}
if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set. Database queries will fail until it is configured.");
}
// `neon-http` creates a fetch-based query function per request — cheap to
// share across invocations, no explicit pool to close.
const sql = connectionString ? neon(connectionString) : null;
export const db = sql
  ? drizzle({ client: sql, schema })
  : new Proxy(
      {},
      {
        get() {
          throw missingDatabaseError();
        },
      },
    );
export { schema };
