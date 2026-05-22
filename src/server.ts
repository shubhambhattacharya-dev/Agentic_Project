import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";


const app = express();

// 1. Security headers injection
app.use(helmet());

// 2. CORS configuration
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === "*" ? "*" : env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
  })
);

// 3. Parse JSON body securely
app.use(express.json({ limit: "10kb" }));

// 4. Register Domain Routes


// 5. Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gigi AI Ops Server is running perfectly!",
    timestamp: new Date().toISOString(),
  });
});

// 6. Global Error Handler Middleware
app.use(errorHandler as any);

// 6. Start Server
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
});

// 7. Graceful Shutdown
const shutdown = () => {
  console.log("Shutting down server gracefully...");
  server.close(() => {
    console.log("Server closed. Active connections finished.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forceful shutdown initiated.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);