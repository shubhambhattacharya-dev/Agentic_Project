// src/config/sentry.ts
import * as Sentry from "@sentry/node";
import { env } from "./env.js";
import { logger } from "./logger.js";

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN not set — Sentry disabled");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
  });

  logger.info("Sentry error monitoring initialized");
}
