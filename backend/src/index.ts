import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { generateRouter } from "./routes/generate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disabled for API server
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per window in production
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));

// Request logging in production
if (isProduction) {
  app.use((req, _res, next) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
    }));
    next();
  });
}

// Routes - support both /generate (development) and /api/generate (production)
app.use("/generate", generateRouter);
app.use("/api/generate", generateRouter);

// Enhanced health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: isProduction ? "production" : "development",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: isProduction ? undefined : err.stack,
  }));

  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Doc2Slides backend running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? "production" : "development"}`);
  console.log(`Gemini API key configured: ${process.env.GEMINI_API_KEY ? "Yes" : "No"}`);
});
