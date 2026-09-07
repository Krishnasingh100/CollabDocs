import pool from "@/lib/db";

export type DocumentRole = "owner" | "editor" | "commenter" | "viewer" | null;

export async function getDocumentAccess(
  documentId: string,
  userId: string
): Promise<DocumentRole> {
  const docResult = await pool.query(
    `SELECT owner_id, link_access FROM documents WHERE id = $1`,
    [documentId]
  );

  const document = docResult.rows[0];
  if (!document) {
    return null;
  }

  if (document.owner_id === userId) {
    return "owner";
  }

  const memberResult = await pool.query(
    `SELECT role FROM document_members WHERE document_id = $1 AND user_id = $2`,
    [documentId, userId]
  );

  if (memberResult.rows[0]?.role) {
    return memberResult.rows[0].role;
  }

  // No explicit membership — fall back to link_access, if the owner turned it on.
  return document.link_access ?? null;
}

export function canRead(role: DocumentRole): boolean {
  return role !== null;
}

export function canComment(role: DocumentRole): boolean {
  return role === "owner" || role === "editor" || role === "commenter";
}

export function canEdit(role: DocumentRole): boolean {
  return role === "owner" || role === "editor";
}

export function canManage(role: DocumentRole): boolean {
  return role === "owner";
}