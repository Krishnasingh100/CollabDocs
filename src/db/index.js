import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
// Vercel-safe: neon-http uses fetch (no TCP/WebSocket pool), so it works
// in Serverless Functions and Edge Runtime without connection leaks.
// Do NOT use `pg` Pool or migrate-on-boot here — run migrations via
// `bun run db:migrate` (drizzle-kit CLI) before/with deploy.
//
// Import-safe by design: a missing DATABASE_URL must never crash `next
// build` (which imports route modules to collect page data) or pages that
// don't touch the database. Instead, any actual query throws a clear error
// at request time, where the API routes catch it and answer graceful 500
// JSON (the client then falls back to its localStorage copy).
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
