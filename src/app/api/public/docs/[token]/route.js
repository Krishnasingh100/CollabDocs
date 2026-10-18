// Anonymous read-only document access for public share tokens.
// Returns title plus TipTap content only; no auth, no plainText needed.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
export async function GET(_req, ctx) {
  const { token } = await ctx.params;
  if (!token || token.length > 64) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const rows = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        content: documentsTable.content,
        deletedAt: documentsTable.deletedAt,
        updatedAt: documentsTable.updatedAt,
      })
      .from(documentsTable)
      .where(eq(documentsTable.shareToken, token))
      .limit(1);
    const row = rows[0];
    if (!row || row.deletedAt != null) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      document: {
        id: row.id,
        title: row.title ?? "Untitled document",
        content: row.content ?? null,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load the shared document";
    return Response.json({ error: message }, { status: 500 });
  }
}
