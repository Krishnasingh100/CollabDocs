import pool from "@/lib/db";

export async function createVersion(documentId: string, createdBy: string, content: string) {
  const result = await pool.query(
    `INSERT INTO document_versions (document_id, created_by, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [documentId, createdBy, content]
  );
  return result.rows[0];
}

export async function listVersions(documentId: string) {
  const result = await pool.query(
    `SELECT v.id, v.created_at, u.name, u.email, u.avatar_url
     FROM document_versions v
     JOIN users u ON u.id = v.created_by
     WHERE v.document_id = $1
     ORDER BY v.created_at DESC`,
    [documentId]
  );
  return result.rows;
}

export async function getVersionById(versionId: string) {
  const result = await pool.query(`SELECT * FROM document_versions WHERE id = $1`, [versionId]);
  return result.rows[0] ?? null;
}

export async function restoreVersion(documentId: string, versionId: string, restoredBy: string) {
  const version = await getVersionById(versionId);
  if (!version || version.document_id !== documentId) {
    return null;
  }

  // Save the current state as a version too, before overwriting it —
  // so restoring is itself undoable, not a destructive dead end.
  const current = await pool.query(`SELECT content FROM documents WHERE id = $1`, [documentId]);
  if (current.rows[0]?.content) {
    await createVersion(documentId, restoredBy, current.rows[0].content);
  }

  const result = await pool.query(
    `UPDATE documents SET content = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [documentId, version.content]
  );
  return result.rows[0];
}