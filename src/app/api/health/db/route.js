import { sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
// GET checks database connectivity. Public scope, no auth required.
// Returns { ok: true } or 500 { ok: false, error }.
export async function GET() {
  try {
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
