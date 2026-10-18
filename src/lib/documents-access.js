// Shared workspace access filter for document detail operations.
// Keeps personal docs private and org docs visible to members.
// includeDeleted lets trash rows stay reachable for restore and permanent delete.
// Drizzle's and() already drops falsy parts, so no extra filtering here.
import { and, eq, isNull } from "drizzle-orm";
import { documentsTable } from "@/db/schema";
export function workspaceCondition(workspace, id, includeDeleted = false) {
  const orgMatch =
    workspace.kind === "organization"
      ? eq(documentsTable.orgId, workspace.organizationId)
      : and(eq(documentsTable.userId, workspace.ownerId), isNull(documentsTable.orgId));
  return and(eq(documentsTable.id, id), orgMatch, includeDeleted ? undefined : isNull(documentsTable.deletedAt));
}
// Builds a short URL-safe public share token. Returns hex/safe string.
export function newShareToken() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
