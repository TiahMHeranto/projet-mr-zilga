import express from "express";
import {
  createSalle,
  fetchSalles,
  fetchSalleById,
  updateSalle,
  removeSalle,
} from "../controllers/salleController";

const router = express.Router();

/* =========================
   SALLES ROUTES
========================= */

// Create room
router.post("/", createSalle);

// Get all rooms
router.get("/", fetchSalles);

// Get one room
router.get("/:id", fetchSalleById);

// Update occupancy / status
router.put("/:id", updateSalle);

// Delete room
router.delete("/:id", removeSalle);

export default router;