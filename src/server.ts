import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/node";
import { clerkMiddleware } from "@clerk/express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { logger } from "./config/logger.js";
import { initSentry } from "./config/sentry.js";
import { connectDB } from "./config/db.js";
import chatRoute from "./routes/chat.routes.js";
import { initializeTools } from "./modules/tools/tool.init.js";

const app = express();

// 1. Initialize Sentry (must be first)
initSentry();

// 2. Sentry request handler (must be before all middleware)
Sentry.setupExpressErrorHandler(app);

// 3. Security headers injection
app.use(helmet());

// 4. Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use(limiter);

// 5. CORS configuration
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === "*" ? "*" : env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// 6. Parse JSON body securely
app.use(express.json({ limit: "100kb" }));

// 7. Clerk authentication middleware
app.use(clerkMiddleware());

// 8. Health Check Endpoint (no auth required)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gigi AI Ops Server is running perfectly!",
    timestamp: new Date().toISOString(),
    sentry: env.SENTRY_DSN ? "connected" : "disabled",
    clerk: env.CLERK_SECRET_KEY ? "connected" : "disabled",
  });
});

// 9. Initialize tools at startup
initializeTools();

// 10. Register Domain Routes
app.use("/api", chatRoute);

// 11. Sentry error handler (must be after routes)
Sentry.setupExpressErrorHandler(app);

// 12. Global Error Handler Middleware
app.use(errorHandler);

// 13. Start Server
async function startServer() {
  try {
    await connectDB();
    
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    });

    // 14. Graceful Shutdown
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
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
}

startServer();
