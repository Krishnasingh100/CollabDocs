import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import { getCommentById, updateComment, deleteComment } from "@/lib/comments/queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comment = await getCommentById(id);
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (comment.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const updated = await updateComment(id, body.content.trim());
  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comment = await getCommentById(id);
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (comment.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteComment(id);
  return NextResponse.json({ success: true });
}