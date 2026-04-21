import pool from "../config/db";

export interface ILog {
  id?: number;
  salle_id: number;
  event: string;
  date_heure: Date;
  details?: string;
  created_at?: Date;
}

/* =========================
   CREATE TABLE
========================= */
export const createLogsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      salle_id INT NOT NULL,
      event VARCHAR(255) NOT NULL,
      date_heure TIMESTAMP NOT NULL,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_salle
        FOREIGN KEY (salle_id)
        REFERENCES salles(id)
        ON DELETE CASCADE
    );
  `);
};

/* =========================
   CREATE LOG
========================= */
export const createLog = async (log: ILog) => {
  const result = await pool.query(
    `
    INSERT INTO logs (salle_id, event, date_heure, details)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `,
    [
      log.salle_id,
      log.event,
      log.date_heure,
      log.details || null,
    ]
  );

  return result.rows[0];
};

/* =========================
   FIND ALL LOGS
========================= */
export const getAllLogs = async () => {
  const result = await pool.query(`
    SELECT * FROM logs
    ORDER BY date_heure DESC
  `);

  return result.rows;
};

/* =========================
   FIND LOG BY ID
========================= */
export const findLogById = async (id: number) => {
  const result = await pool.query(
    `SELECT * FROM logs WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0];
};

/* =========================
   FIND LOGS BY SALLE
========================= */
export const getLogsBySalle = async (salle_id: number) => {
  const result = await pool.query(
    `
    SELECT * FROM logs
    WHERE salle_id = $1
    ORDER BY date_heure DESC
    `,
    [salle_id]
  );

  return result.rows;
};

/* =========================
   DELETE LOG
========================= */
export const deleteLog = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM logs WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0];
};

