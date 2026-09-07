import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canManage } from "@/lib/permissions/check";
import { setLinkAccess, addDocumentMember, listDocumentMembers } from "@/lib/documents/queries";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const role = await getDocumentAccess(documentId, user.id);
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await listDocumentMembers(documentId);
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { documentId, email, role: inviteRole, linkAccess } = body;

  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const role = await getDocumentAccess(documentId, user.id);
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Two possible actions in one route: set link access, or invite by email.
  if (linkAccess !== undefined) {
    if (linkAccess !== null && !["viewer", "commenter", "editor"].includes(linkAccess)) {
      return NextResponse.json({ error: "Invalid link access value" }, { status: 400 });
    }
    const document = await setLinkAccess(documentId, linkAccess);
    return NextResponse.json({ document });
  }

  if (email) {
    if (!["viewer", "commenter", "editor"].includes(inviteRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const result = await addDocumentMember(documentId, email, inviteRole);
    if ("error" in result) {
      return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
    }
    return NextResponse.json({ member: result.member }, { status: 201 });
  }

  return NextResponse.json({ error: "Provide email+role or linkAccess" }, { status: 400 });
}