import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { getCurrentUser } from "@/lib/auth/sync";
import { getDocumentAccess, canRead } from "@/lib/permissions/check";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room } = await request.json();
  if (typeof room !== "string" || !room) {
    return NextResponse.json({ error: "room is required" }, { status: 400 });
  }

  // Our convention: the Liveblocks room ID IS the document's UUID.
  const documentId = room;
  const role = await getDocumentAccess(documentId, user.id);

  if (!canRead(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.name ?? user.email,
      avatar: user.avatar_url ?? undefined,
    },
  });

  // Grant access only to this exact room, with permissions matching their DB role.
  if (role === "owner" || role === "editor") {
    session.allow(room, session.FULL_ACCESS);
  } else {
    session.allow(room, ["room:read", "room:presence:write"]);
  }

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}