import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  try {
    await pool.query(sql);
    console.log("Schema created successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();