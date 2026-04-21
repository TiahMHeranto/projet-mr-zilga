import { Request, Response } from "express";
import {
  createSalle as insertSalle,
  getAllSalles,
  findSalleById,
  findSalleByCode,
  updateSalleStatus,
  deleteSalle,
} from "../models/Salle";
import { log } from "../utils/logger";

/* ==================================================
   BUSINESS RULE
   occupé if nombre_occupant >= 5
   otherwise libre
================================================== */
const getSalleStatus = (
  count: number
): "libre" | "occupé" => {
  return count >= 5 ? "occupé" : "libre";
};

/* =========================
   CREATE SALLE
========================= */
export const createSalle = async (
  req: Request,
  res: Response
) => {
  try {
    const { code_salle } = req.body;

    if (!code_salle) {
      return res.status(400).json({
        success: false,
        message: "code_salle is required",
      });
    }

    const existing = await findSalleByCode(code_salle);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Salle already exists",
      });
    }

    const newSalle = await insertSalle({
      code_salle,
      statut: "libre",
      nombre_occupant: 0,
    });

    return res.status(201).json({
      success: true,
      data: newSalle,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to create salle",
      error: err.message,
    });
  }
};

/* =========================
   GET ALL SALLES
========================= */
export const fetchSalles = async (
  _req: Request,
  res: Response
) => {
  try {
    const salles = await getAllSalles();

    return res.json({
      success: true,
      count: salles.length,
      data: salles,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salles",
      error: err.message,
    });
  }
};

/* =========================
   GET SALLE BY ID
========================= */
export const fetchSalleById = async (
  req: Request,
  res: Response
) => {
  try {
    const salle = await findSalleById(
      Number(req.params.id)
    );

    if (!salle) {
      return res.status(404).json({
        success: false,
        message: "Salle not found",
      });
    }

    return res.json({
      success: true,
      data: salle,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salle",
      error: err.message,
    });
  }
};

/* =========================
   UPDATE OCCUPANTS / STATUS
========================= */
export const updateSalle = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const { nombre_occupant } = req.body;

    if (
      nombre_occupant === undefined ||
      nombre_occupant < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid nombre_occupant is required",
      });
    }

    const statut = getSalleStatus(
      Number(nombre_occupant)
    );

    const updated = await updateSalleStatus(
      id,
      statut,
      Number(nombre_occupant)
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Salle not found",
      });
    }

    log("Salle updated", {
      salle_id: id,
      nombre_occupant,
      statut,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: updated,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to update salle",
      error: err.message,
    });
  }
};

/* =========================
   DELETE SALLE
========================= */
export const removeSalle = async (
  req: Request,
  res: Response
) => {
  try {
    const deleted = await deleteSalle(
      Number(req.params.id)
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Salle not found",
      });
    }

    return res.json({
      success: true,
      message: "Salle deleted",
      data: deleted,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete salle",
      error: err.message,
    });
  }
};