import pool from "@/lib/db";

export async function GET() {
  console.log("DATABASE_URL is:", process.env.DATABASE_URL);
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    return Response.json({ connected: true, time: result.rows[0].current_time });
  } catch (error) {
    console.error("Database connection error:", error);
    return Response.json({ connected: false }, { status: 500 });
  }
}