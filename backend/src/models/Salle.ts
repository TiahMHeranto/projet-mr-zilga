import pool from "../config/db";

export interface ISalle {
  id?: number;
  code_salle: string;
  statut?: "libre" | "occupé";
  nombre_occupant?: number;
  updated_at?: Date;
}

/* =========================
   CREATE TABLE
========================= */
export const createSallesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salles (
      id SERIAL PRIMARY KEY,
      code_salle VARCHAR(10) UNIQUE NOT NULL,
      statut VARCHAR(10) NOT NULL DEFAULT 'libre'
        CHECK (statut IN ('libre', 'occupé')),
      nombre_occupant INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

/* =========================
   CREATE SALLE
========================= */
export const createSalle = async (salle: ISalle) => {
  const result = await pool.query(
    `
    INSERT INTO salles (code_salle, statut, nombre_occupant)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [
      salle.code_salle,
      salle.statut || "libre",
      salle.nombre_occupant || 0,
    ]
  );

  return result.rows[0];
};

/* =========================
   FIND ALL SALLES
========================= */
export const getAllSalles = async () => {
  const result = await pool.query(`
    SELECT * FROM salles
    ORDER BY id ASC
  `);

  return result.rows;
};

/* =========================
   FIND BY ID
========================= */
export const findSalleById = async (id: number) => {
  const result = await pool.query(
    `SELECT * FROM salles WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0];
};

/* =========================
   FIND BY CODE SALLE
========================= */
export const findSalleByCode = async (code_salle: string) => {
  const result = await pool.query(
    `SELECT * FROM salles WHERE code_salle = $1 LIMIT 1`,
    [code_salle]
  );

  return result.rows[0];
};

/* =========================
   UPDATE SALLE STATUS
========================= */
export const updateSalleStatus = async (
  id: number,
  statut: "libre" | "occupé",
  nombre_occupant: number
) => {
  const result = await pool.query(
    `
    UPDATE salles
    SET statut = $1,
        nombre_occupant = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *;
    `,
    [statut, nombre_occupant, id]
  );

  return result.rows[0];
};

/* =========================
   DELETE SALLE
========================= */
export const deleteSalle = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM salles WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0];
};