import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveWorkspace } from "@/lib/auth/require-user";
import { workspaceCondition } from "@/lib/documents-access";
// Takes row; returns full document detail shape.
function toDetail(row) {  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    templateId: row.templateId ?? null,
    orgId: row.orgId ?? null,
    content: row.content ?? null,
    hasPublicLink: row.shareToken != null,
    deletedAt:
      row.deletedAt instanceof Date ? row.deletedAt.toISOString() : row.deletedAt ? String(row.deletedAt) : null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}
// Builds access filter for one document: org id match or personal owner match.
// Keeps personal docs private and org docs visible to members.
// Delegation now lives in src/lib/documents-access.

// GET loads one document in active workspace. Requires auth, 401/404 on miss.
// Returns { document: full detail } with TipTap content.
export async function GET(_req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(workspaceCondition(workspace, id))
      .limit(1);
    const row = rows[0];
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load document";
    return Response.json({ error: message }, { status: 500 });
  }
}
// PATCH updates title/content/plainText in active workspace. Requires auth.
// Returns { document: updated detail }, 404 when not found, 400 on a content
// payload that is not a TipTap doc.
export async function PATCH(req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    // Content must be a TipTap document object (can be partial from earlier
    // versions); rejecting junk keeps jsonb column and exports well-formed.
    if (body.content !== undefined) {
      const valid =
        body.content === null ||
        (typeof body.content === "object" && !Array.isArray(body.content) && body.content.type === "doc");
      if (!valid) return Response.json({ error: "Invalid content payload" }, { status: 400 });
    }
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
      .where(workspaceCondition(workspace, id))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save document";
    return Response.json({ error: message }, { status: 500 });
  }
}
// DELETE: trash=0 default moves one document to trash (soft delete keeps the
// row for restore); ?purge=1 removes it permanently. Requires auth.
export async function DELETE(req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const purge = new URL(req.url).searchParams.get("purge") === "1";
  try {
    if (purge) {
      const rows = await db
        .delete(documentsTable)
        .where(workspaceCondition(workspace, id, true))
        .returning({ id: documentsTable.id });
      if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ ok: true, purged: true });
    }
    const [row] = await db
      .update(documentsTable)
      .set({ deletedAt: new Date(), shareToken: null })
      .where(workspaceCondition(workspace, id))
      .returning({ id: documentsTable.id });
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true, purged: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return Response.json({ error: message }, { status: 500 });
  }
}
