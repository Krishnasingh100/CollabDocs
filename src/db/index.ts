import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Vercel-safe: neon-http uses fetch (no TCP/WebSocket pool), so it works
// in Serverless Functions and Edge Runtime without connection leaks.
// Do NOT use `pg` Pool or migrate-on-boot here — run migrations via
// `bun run db:migrate` (drizzle-kit CLI) before/with deploy.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env (local) and to Vercel Project Settings → Environment Variables.",
  );
}

// `neon-http` creates a fetch-based query function per request — cheap to
// share across invocations, no explicit pool to close.
const sql = neon(connectionString);

export const db = drizzle({ client: sql, schema });

export type Database = typeof db;
export { schema };
