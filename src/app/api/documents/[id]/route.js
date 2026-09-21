import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveOwner } from "@/lib/auth/require-user";
function toDetail(row) {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    templateId: row.templateId ?? null,
    content: row.content ?? null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}
export async function GET(_req, ctx) {
  const { id } = await ctx.params;
  const owner = await resolveOwner();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, owner.ownerId)))
      .limit(1);
    const row = rows[0];
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document";
    return Response.json({ error: message }, { status: 500 });
  }
}
export async function PATCH(req, ctx) {
  const { id } = await ctx.params;
  const owner = await resolveOwner();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const [row] = await db
      .update(documentsTable)
      .set({
        ...(body.title !== undefined
          ? { title: body.title.slice(0, 255) || "Untitled document" }
          : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.plainText !== undefined ? { plainText: body.plainText.slice(0, 20000) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, owner.ownerId)))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save document";
    return Response.json({ error: message }, { status: 500 });
  }
}
export async function DELETE(_req, ctx) {
  const { id } = await ctx.params;
  const owner = await resolveOwner();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, owner.ownerId)));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return Response.json({ error: message }, { status: 500 });
  }
}
