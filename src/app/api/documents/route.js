import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveWorkspace } from "@/lib/auth/require-user";
function toSummary(row) {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    templateId: row.templateId ?? null,
    orgId: row.orgId ?? null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}
// GET lists documents in active workspace (org or personal). Requires auth, 401 when logged out.
// Returns { documents: summaries } (500 with error message on DB failure).
export async function GET() {
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const condition =
      workspace.kind === "organization"
        ? eq(documentsTable.orgId, workspace.organizationId)
        : and(eq(documentsTable.userId, workspace.ownerId), isNull(documentsTable.orgId));
    const rows = await db
      .select()
      .from(documentsTable)
      .where(condition)
      .orderBy(desc(documentsTable.updatedAt))
      .limit(100);
    return Response.json({ documents: rows.map(toSummary) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list documents";
    return Response.json({ documents: [], error: message }, { status: 500 });
  }
}
// POST creates document in active workspace. Requires auth, 401 when logged out.
// Takes title/content/plainText/templateId. Returns { document } with 201.
export async function POST(req) {
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const creatorId = workspace.kind === "organization" ? workspace.userId : workspace.ownerId;
    const [row] = await db
      .insert(documentsTable)
      .values({
        userId: creatorId,
        orgId: workspace.kind === "organization" ? workspace.organizationId : null,
        templateId: body.templateId?.slice(0, 64) || null,
        title: body.title?.slice(0, 255) || "Untitled document",
        content: body.content ?? null,
        plainText: body.plainText?.slice(0, 20000) ?? "",
      })
      .returning();
    return Response.json(
      {
        document: {
          ...toSummary(row),
          content: row.content ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create document";
    return Response.json({ error: message }, { status: 500 });
  }
}
