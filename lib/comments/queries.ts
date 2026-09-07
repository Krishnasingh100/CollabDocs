import pool from "@/lib/db";

export async function createComment(documentId: string, userId: string, content: string) {
  const result = await pool.query(
    `INSERT INTO comments (document_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [documentId, userId, content]
  );
  return result.rows[0];
}

export async function listDocumentComments(documentId: string) {
  const result = await pool.query(
    `SELECT c.*, u.name, u.email, u.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.document_id = $1
     ORDER BY c.created_at ASC`,
    [documentId]
  );
  return result.rows;
}

export async function getCommentById(commentId: string) {
  const result = await pool.query(`SELECT * FROM comments WHERE id = $1`, [commentId]);
  return result.rows[0] ?? null;
}

export async function updateComment(commentId: string, content: string) {
  const result = await pool.query(
    `UPDATE comments SET content = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [commentId, content]
  );
  return result.rows[0] ?? null;
}

export async function deleteComment(commentId: string) {
  await pool.query(`DELETE FROM comments WHERE id = $1`, [commentId]);
}