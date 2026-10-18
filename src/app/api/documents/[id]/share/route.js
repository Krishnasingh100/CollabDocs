import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveWorkspace } from "@/lib/auth/require-user";
import { newShareToken, workspaceCondition } from "@/lib/documents-access";
// POST toggles the public view-only link. Body { enable: boolean }:
// true creates the token if missing (idempotent) and returns it,
// false clears it. Requires auth; trashed docs cannot be shared.
export async function POST(req, ctx) {
  const { id } = await ctx.params;
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const enable = Boolean(body.enable);
    if (enable) {
      // Only rotate when there is no previous token: re-enabling keeps the
      // same URL so previously copied links keep working.
      const [row] = await db
        .update(documentsTable)
        .set({ shareToken: newShareToken() })
        .where(workspaceCondition(workspace, id))
        .returning();
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ shareToken: row.shareToken });
    }
    const [row] = await db
      .update(documentsTable)
      .set({ shareToken: null })
      .where(workspaceCondition(workspace, id))
      .returning();
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ shareToken: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update the public link";
    return Response.json({ error: message }, { status: 500 });
  }
}
