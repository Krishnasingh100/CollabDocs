import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";

function toDetail(row: typeof documentsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    content: (row.content as unknown) ?? null,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load document";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      content?: unknown;
      plainText?: string;
    };
    const [row] = await db
      .update(documentsTable)
      .set({
        ...(body.title !== undefined
          ? { title: body.title.slice(0, 255) || "Untitled document" }
          : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.plainText !== undefined
          ? { plainText: body.plainText.slice(0, 20000) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(documentsTable.id, id))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save document";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">,
) {
  const { id } = await ctx.params;
  try {
    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return Response.json({ error: message }, { status: 500 });
  }
}
