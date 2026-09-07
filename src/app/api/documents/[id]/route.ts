import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import {
  getDocumentById,
  updateDocumentTitle,
  deleteDocument,
} from "@/lib/documents/queries";
import { getDocumentAccess, canRead, canEdit, canManage } from "@/lib/permissions/check";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getDocumentAccess(id, user.id);

  if (!canRead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await getDocumentById(id);
  return NextResponse.json({ document, role });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getDocumentAccess(id, user.id);

  if (!canEdit(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const updated = await updateDocumentTitle(id, body.title.trim());
  return NextResponse.json({ document: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = await getDocumentAccess(id, user.id);

  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteDocument(id);
  return NextResponse.json({ success: true });
}