import express, { Application } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import logRoutes from "./routes/logRoutes";
import salleRoutes from "./routes/salleRoutes"
import { limiter } from "./middlewares/rateLimiter";

const app: Application = express();

/* =========================
   CORS CONFIGURATION
========================= */
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? process.env.FRONTEND_URL || "https://yourdomain.com"  // Production URL
    : true, // Allow all origins in development
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Required for Socket.io and auth
};

app.use(cors(corsOptions));

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());
app.use(limiter);

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/salle", salleRoutes)

/* =========================
   DEBUG ROUTE (DEV ONLY)
========================= */
if (process.env.NODE_ENV !== "production") {
  app.get("/api/cors-config", (_req, res) => {
    res.json({
      cors: "OPEN",
      message: "All origins allowed (dev mode)",
      config: corsOptions
    });
  });
}

export default app;