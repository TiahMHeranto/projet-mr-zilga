// src/routes/logRoutes.ts
import express from "express";
import { createLog } from "../controllers/logController";

const router = express.Router();

router.post("/", createLog);

export default router;