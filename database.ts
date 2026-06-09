import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL conectado:", result.rows[0]);
  } catch (error) {
    console.error("❌ Error PostgreSQL:", error);
  }
}
