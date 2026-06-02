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
import webhookRoute from "./routes/webhook.routes.js";
import adminRoute from "./routes/admin.routes.js";
import accountRoute from "./routes/account.routes.js";
import { initializeTools } from "./modules/tools/tool.init.js";

const app = express();

// 1. Initialize Sentry (must be first)
initSentry();

// 2. Sentry request handler
Sentry.setupExpressErrorHandler(app);

// 3. Security headers
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

// 5. CORS
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === "*" ? "*" : env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// 6. Parse JSON (webhook route needs raw body, so it handles its own parsing)
app.use((req, res, next) => {
  if (req.path === "/api/webhooks/clerk-webhook") {
    return next();
  }
  express.json({ limit: "100kb" })(req, res, next);
});

// 7. Clerk middleware
app.use(clerkMiddleware());

// 8. Health Check (no auth)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "GIGI Energy AI Support is running!",
    timestamp: new Date().toISOString(),
    sentry: env.SENTRY_DSN ? "connected" : "disabled",
    clerk: env.CLERK_SECRET_KEY ? "connected" : "disabled",
  });
});

// 9. Initialize tools
initializeTools();

// 10. Register Routes
app.use("/api", chatRoute);
app.use("/api/webhooks", webhookRoute);
app.use("/api/admin", adminRoute);
app.use("/api/account", accountRoute);

// 11. Sentry error handler
Sentry.setupExpressErrorHandler(app);

// 12. Global Error Handler
app.use(errorHandler);

// 13. Start Server
async function startServer() {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    });

    // Graceful Shutdown
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
