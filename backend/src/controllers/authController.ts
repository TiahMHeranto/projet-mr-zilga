// src/controllers/authController.ts
import { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { log } from "../utils/logger";

export const register = async (req: Request, res: Response) => {
  try {
    const user = await User.create(req.body);
    
    // Log de succès
    log("User registered successfully", {
      event: "user_registered",
      userId: user._id,
      email: user.email,
      username: user.username,
      ip: req.ip
    });
    
    res.status(201).json(user);
  } catch (err: any) {
    // Amélioration: messages plus explicites selon le type d'erreur
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      
      // Log d'échec - doublon
      log("Registration failed - duplicate key", {
        event: "registration_failed",
        reason: "duplicate_key",
        field: field,
        email: req.body.email,
        username: req.body.username,
        ip: req.ip
      });
      
      if (field === 'email') {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      if (field === 'username') {
        return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
      }
      return res.status(400).json({ message: "Un compte avec ces informations existe déjà" });
    }
    
    if (err.name === "ValidationError") {
      // Log d'échec - validation
      log("Registration failed - validation error", {
        event: "registration_failed",
        reason: "validation_error",
        errors: err.errors,
        ip: req.ip
      });
      
      return res.status(400).json({ message: "Données invalides: " + err.message });
    }
    
    // Log d'erreur inattendue
    log("Registration error", {
      event: "registration_error",
      error: err.message,
      stack: err.stack,
      ip: req.ip
    });
    
    res.status(400).json({ message: "Erreur lors de l'inscription" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Log d'échec - utilisateur non trouvé
      log("Login failed - user not found", {
        event: "login_failed",
        reason: "user_not_found",
        email: req.body.email,
        ip: req.ip
      });
      
      return res.status(404).json({ message: "Aucun compte associé à cet email" });
    }

    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) {
      // Log d'échec - mot de passe incorrect
      log("Login failed - invalid password", {
        event: "login_failed",
        reason: "invalid_password",
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // Log de succès
    log("Login successful", {
      event: "login_success",
      userId: user._id,
      email: user.email,
      ip: req.ip
    });

    res.json({ token });
  } catch (err: any) {
    // Log d'erreur inattendue
    log("Login error", {
      event: "login_error",
      error: err.message,
      stack: err.stack,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      // Log d'avertissement - utilisateur non trouvé
      log("Get profile failed - user not found", {
        event: "get_profile_failed",
        reason: "user_not_found",
        userId: userId,
        ip: req.ip
      });
      
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Log de succès
    log("Get profile successful", {
      event: "get_profile_success",
      userId: user._id,
      email: user.email,
      ip: req.ip
    });
    
    res.json(user);
  } catch (err: any) {
    // Log d'erreur inattendue
    log("Get profile error", {
      event: "get_profile_error",
      error: err.message,
      stack: err.stack,
      userId: (req as any).user?.id,
      ip: req.ip
    });
    
    res.status(500).json({ message: "Erreur lors de la récupération du profil" });
  }
};