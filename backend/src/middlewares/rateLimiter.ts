// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes par IP
  message: {
    message: "Trop de requêtes, veuillez réessayer dans 15 minutes",
    retryAfter: "15 minutes"
  },
  standardHeaders: true, // Renvoie les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Compte aussi les requêtes réussies
});

// Limiteur plus strict pour les routes sensibles (login, création)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Seulement 5 tentatives
  message: {
    message: "Trop de tentatives, veuillez réessayer dans 15 minutes"
  },
});