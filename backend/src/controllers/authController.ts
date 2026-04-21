// src/controllers/authController.ts
import { Request, Response } from "express";
import {
  createUser,
  findUserByEmail,
  comparePassword,
} from "../models/User";
import { default as pool } from "../config/db";
import jwt from "jsonwebtoken";
import { log } from "../utils/logger";

export const register = async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);

    log("User registered successfully", {
      event: "user_registered",
      userId: user.id,
      email: user.email,
      username: user.username,
      ip: req.ip,
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === "23505") {
      const detail = err.detail || "";

      log("Registration failed - duplicate key", {
        event: "registration_failed",
        reason: "duplicate_key",
        detail,
        ip: req.ip,
      });

      if (detail.includes("email")) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      if (detail.includes("username")) {
        return res
          .status(400)
          .json({ message: "Ce nom d'utilisateur est déjà pris" });
      }

      return res
        .status(400)
        .json({ message: "Un compte existe déjà avec ces informations" });
    }

    log("Registration error", {
      event: "registration_error",
      error: err.message,
      ip: req.ip,
    });

    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const user = await findUserByEmail(req.body.email);

    if (!user) {
      log("Login failed - user not found", {
        event: "login_failed",
        reason: "user_not_found",
        email: req.body.email,
        ip: req.ip,
      });

      return res
        .status(404)
        .json({ message: "Aucun compte associé à cet email" });
    }

    const isMatch = await comparePassword(
      req.body.password,
      user.password
    );

    if (!isMatch) {
      log("Login failed - invalid password", {
        event: "login_failed",
        reason: "invalid_password",
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    log("Login successful", {
      event: "login_success",
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    res.json({ token });
  } catch (err: any) {
    log("Login error", {
      event: "login_error",
      error: err.message,
      email: req.body.email,
      ip: req.ip,
    });

    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const result = await pool.query(
      `
      SELECT id, name, username, email, role, created_at
      FROM users
      WHERE id = $1
      LIMIT 1;
      `,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      log("Get profile failed - user not found", {
        event: "get_profile_failed",
        reason: "user_not_found",
        userId,
        ip: req.ip,
      });

      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    log("Get profile successful", {
      event: "get_profile_success",
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    res.json(user);
  } catch (err: any) {
    log("Get profile error", {
      event: "get_profile_error",
      error: err.message,
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du profil" });
  }
};