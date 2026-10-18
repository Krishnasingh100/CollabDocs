import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveWorkspace } from "@/lib/auth/require-user";
import { workspaceCondition } from "@/lib/documents-access";
// POST restores one trashed document (clears deletedAt). Requires auth.
// Returns { document: summary }, 404 when not found.
export async function POST(_req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [row] = await db
      .update(documentsTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(workspaceCondition(workspace, id, true))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      document: {
        id: row.id,
        title: row.title ?? "Untitled document",
        deletedAt: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore document";
    return Response.json({ error: message }, { status: 500 });
  }
}
