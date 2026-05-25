import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { logger } from "./config/logger.js";

const app = express();

// 1. Security headers injection
app.use(helmet());

// 2. Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use(limiter);

// 3. CORS configuration
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === "*" ? "*" : env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
  })
);

// 4. Parse JSON body securely
app.use(express.json({ limit: "10kb" }));

// 5. Register Domain Routes

// 6. Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gigi AI Ops Server is running perfectly!",
    timestamp: new Date().toISOString(),
  });
});

// 7. Global Error Handler Middleware
app.use(errorHandler);

// 8. Start Server
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
});

// 9. Graceful Shutdown
const shutdown = () => {
  logger.info("Shutting down server gracefully...");
  server.close(() => {
    logger.info("Server closed. Active connections finished.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forceful shutdown initiated.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);