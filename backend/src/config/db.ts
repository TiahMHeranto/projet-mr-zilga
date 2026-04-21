import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();

    const result = await client.query("SELECT NOW()");
    console.log("PostgreSQL connecté:", result.rows[0].now);

    client.release();
  } catch (error) {
    console.error("Erreur PostgreSQL:", error);
    process.exit(1);
  }
};

export default pool;