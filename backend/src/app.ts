import express, { Application } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import logRoutes from "./routes/logRoutes";
import { limiter } from "./middlewares/rateLimiter";

const app: Application = express();

// Parse allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

// Dynamic CORS configuration based on environment
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);

// Optional: Add a route to check allowed origins (for debugging)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/cors-config', (req, res) => {
    res.json({ allowedOrigins });
  });
}

export default app;