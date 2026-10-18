import { and, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
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
    hasPublicLink: row.shareToken != null,
    deletedAt: row.deletedAt ? (row.deletedAt instanceof Date ? row.deletedAt.toISOString() : String(row.deletedAt)) : null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}
// Workspace scope for listing: org docs shared to members, personal docs private.
// Trash mode (trash=1) selects deleted rows instead of live ones.
function listCondition(workspace, trash) {
  const owner =
    workspace.kind === "organization"
      ? eq(documentsTable.orgId, workspace.organizationId)
      : and(eq(documentsTable.userId, workspace.ownerId), isNull(documentsTable.orgId));
  return and(owner, trash ? isNotNull(documentsTable.deletedAt) : isNull(documentsTable.deletedAt));
}
// GET lists documents in active workspace (org or personal). Requires auth, 401 when logged out.
// Optional query params: q (title/plain text search), trash (deleted documents list).
// Returns { documents: summaries } (500 with error message on DB failure).
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const trash = searchParams.get("trash") === "1";
  const workspace = await resolveWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    let condition = listCondition(workspace, trash);
    if (q) {
      const needle = `%${q}%`;
      condition = and(
        condition,
        or(ilike(documentsTable.title, needle), ilike(documentsTable.plainText, needle)),
      );
    }
    // Summary-only projection: the content blob (often large) stays in the
    // database on list calls, so the dashboard loads in one light query.
    const rows = await db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        plainText: documentsTable.plainText,
        templateId: documentsTable.templateId,
        orgId: documentsTable.orgId,
        shareToken: documentsTable.shareToken,
        deletedAt: documentsTable.deletedAt,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
      })
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
