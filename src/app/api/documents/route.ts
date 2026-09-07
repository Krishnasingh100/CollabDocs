import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/sync";
import { createDocument, listUserDocuments } from "@/lib/documents/queries";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await listUserDocuments(user.id);
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim()
    : "Untitled document";

  const document = await createDocument(user.id, title);
  return NextResponse.json({ document }, { status: 201 });
}