import pool from "../config/db";
import bcrypt from "bcrypt";

export interface IUser {
  id?: number;
  name: string;
  username: string;
  email: string;
  password: string;
  role?: "user" | "admin";
  created_at?: Date;
  updated_at?: Date;
}

/* =========================
   CREATE TABLE
========================= */
export const createUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(10) DEFAULT 'user'
        CHECK (role IN ('user','admin')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

/* =========================
   CREATE USER
========================= */
export const createUser = async (user: IUser) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);

  const result = await pool.query(
    `
    INSERT INTO users (name, username, email, password, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, username, email, role, created_at;
    `,
    [
      user.name,
      user.username,
      user.email,
      hashedPassword,
      user.role || "user",
    ]
  );

  return result.rows[0];
};

/* =========================
   FIND BY EMAIL
========================= */
export const findUserByEmail = async (email: string) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );

  return result.rows[0];
};

/* =========================
   FIND BY ID
========================= */
export const findUserById = async (id: number) => {
  const result = await pool.query(
    `SELECT id, name, username, email, role FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

/* =========================
   PASSWORD CHECK
========================= */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};