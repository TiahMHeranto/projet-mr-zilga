// src/routes/authRoutes.ts
import { Router } from "express";
import { login, register, getUser } from "../controllers/authController";
import { validate } from "../middlewares/validation";
import { strictLimiter } from "../middlewares/rateLimiter";
import { protect } from "../middlewares/authMiddleware";
import { z } from "zod";

const router = Router();

// Schemas de validation
const registerSchema = z.object({
  email: z.string().email("Email invalide").toLowerCase().trim(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const loginSchema = z.object({
  email: z.string().email("Email invalide").toLowerCase().trim(),
  password: z.string().min(1, "Le mot de passe est requis"),
});

// Routes avec rate limiting strict (5 tentatives max)
router.post("/register", strictLimiter, register);
router.post("/login", strictLimiter, validate(loginSchema), login);

// Route protégée pour récupérer le profil
router.get("/profile", protect, getUser);

export default router;



