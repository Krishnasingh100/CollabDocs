import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import pool from "@/lib/db";

export async function getCurrentUser() {
 const session = await auth.getSession({ fetchOptions: { headers: await headers() } });

  if (!session?.data?.user) {
    return null;
  }

  const { id: authUserId, email, name, image } = session.data.user;

  const result = await pool.query(
    `INSERT INTO users (auth_user_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth_user_id)
     DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING *`,
    [authUserId, email, name ?? null, image ?? null]
  );

  return result.rows[0];
}