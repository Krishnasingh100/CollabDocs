import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canRead, canComment } from "@/lib/permissions/check";
import { createComment, listDocumentComments } from "@/lib/comments/queries";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const role = await getDocumentAccess(documentId, user.id);
  if (!canRead(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comments = await listDocumentComments(documentId);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { documentId, content } = body;

  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const role = await getDocumentAccess(documentId, user.id);
  if (!canComment(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comment = await createComment(documentId, user.id, content.trim());
  return NextResponse.json({ comment }, { status: 201 });
}