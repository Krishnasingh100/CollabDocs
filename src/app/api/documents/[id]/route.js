import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveWorkspace } from "@/lib/auth/require-user";
function toDetail(row) {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    templateId: row.templateId ?? null,
    orgId: row.orgId ?? null,
    content: row.content ?? null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}
// Builds access filter for one document: org id match or personal owner match.
// Keeps personal docs private and org docs visible to members.
function workspaceCondition(workspace, id) {
  if (workspace.kind === "organization") {
    return and(eq(documentsTable.id, id), eq(documentsTable.orgId, workspace.organizationId));
  }
  return and(
    eq(documentsTable.id, id),
    eq(documentsTable.userId, workspace.ownerId),
    isNull(documentsTable.orgId),
  );
}
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
// Returns { document: updated detail }, 404 when not found.
export async function PATCH(req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      .where(workspaceCondition(workspace, id))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: toDetail(row) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save document";
    return Response.json({ error: message }, { status: 500 });
  }
}
// DELETE removes one document in active workspace. Requires auth.
// Returns { ok: true } on success, 401 when logged out.
export async function DELETE(_req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await db.delete(documentsTable).where(workspaceCondition(workspace, id));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return Response.json({ error: message }, { status: 500 });
  }
}
