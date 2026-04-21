// src/routes/logRoutes.ts
import express from "express";
import { createLog, fetchLogs, fetchLogsBySalle} from "../controllers/logController";


const router = express.Router();

router.post("/", createLog);
router.get("/", fetchLogs)
router.get("/:id", fetchLogs)

export default router;