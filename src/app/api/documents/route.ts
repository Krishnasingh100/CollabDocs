import { desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { documentsTable } from "@/db/schema";
import { resolveOwner } from "@/lib/auth/require-user";

function toSummary(row: typeof documentsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title ?? "Untitled document",
    plainText: row.plainText ?? "",
    templateId: row.templateId ?? null,
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

export async function GET() {
  const owner = await resolveOwner();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, owner.ownerId))
      .orderBy(desc(documentsTable.updatedAt))
      .limit(100);
    return Response.json({ documents: rows.map(toSummary) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list documents";
    return Response.json({ documents: [], error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const owner = await resolveOwner();
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      content?: unknown;
      plainText?: string;
      templateId?: string;
    };
    const [row] = await db
      .insert(documentsTable)
      .values({
        userId: owner.ownerId,
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
          content: (row.content as unknown) ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    return Response.json({ error: message }, { status: 500 });
  }
}
