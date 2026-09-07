import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canRead, canEdit } from "@/lib/permissions/check";
import { createVersion, listVersions, restoreVersion } from "@/lib/versions/queries";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const role = await getDocumentAccess(documentId, user.id);
  if (!canRead(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const versions = await listVersions(documentId);
  return NextResponse.json({ versions });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { documentId, content, restoreVersionId } = body;

  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const role = await getDocumentAccess(documentId, user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (restoreVersionId) {
    const document = await restoreVersion(documentId, restoreVersionId, user.id);
    if (!document) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    return NextResponse.json({ document });
  }

  if (typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const version = await createVersion(documentId, user.id, content);
  return NextResponse.json({ version }, { status: 201 });
}