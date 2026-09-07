import pool from "@/lib/db";

export async function createDocument(ownerId: string, title: string) {
  const result = await pool.query(
    `INSERT INTO documents (owner_id, title)
     VALUES ($1, $2)
     RETURNING *`,
    [ownerId, title]
  );
  return result.rows[0];
}

export async function getDocumentById(documentId: string) {
  const result = await pool.query(
    `SELECT * FROM documents WHERE id = $1`,
    [documentId]
  );
  return result.rows[0] ?? null;
}

export async function listUserDocuments(userId: string) {
  const result = await pool.query(
    `SELECT DISTINCT d.*
     FROM documents d
     LEFT JOIN document_members dm ON dm.document_id = d.id
     WHERE d.owner_id = $1 OR dm.user_id = $1
     ORDER BY d.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function updateDocumentTitle(documentId: string, title: string) {
  const result = await pool.query(
    `UPDATE documents
     SET title = $2, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [documentId, title]
  );
  return result.rows[0] ?? null;
}

export async function deleteDocument(documentId: string) {
  await pool.query(`DELETE FROM documents WHERE id = $1`, [documentId]);
}
export async function setLinkAccess(documentId: string, linkAccess: string | null) {
  const result = await pool.query(
    `UPDATE documents SET link_access = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [documentId, linkAccess]
  );
  return result.rows[0] ?? null;
}

export async function addDocumentMember(documentId: string, userEmail: string, role: string) {
  const userResult = await pool.query(`SELECT id FROM users WHERE email = $1`, [userEmail]);
  const invitedUser = userResult.rows[0];
  if (!invitedUser) return { error: "no_account" as const };

  const result = await pool.query(
    `INSERT INTO document_members (document_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [documentId, invitedUser.id, role]
  );
  return { member: result.rows[0] };
}

export async function listDocumentMembers(documentId: string) {
  const result = await pool.query(
    `SELECT dm.role, u.id as user_id, u.name, u.email, u.avatar_url
     FROM document_members dm JOIN users u ON u.id = dm.user_id
     WHERE dm.document_id = $1`,
    [documentId]
  );
  return result.rows;
}