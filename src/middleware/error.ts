import { ErrorRequestHandler } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  isOperational?: boolean;
  type?: string;
  body?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, req, res, _next) => {
  logger.error(err, `[SERVER ERROR]: ${err.message}`);

  // Report to Sentry (non-operational errors)
  if (!err.isOperational) {
    Sentry.captureException(err);
  }

  const isMalformedJson =
    err instanceof SyntaxError &&
    err.type === "entity.parse.failed" &&
    (err.status === 400 || err.statusCode === 400);

  const statusCode = isMalformedJson ? 400 : err.statusCode || err.status || 500;

  // Mask 500 errors in production to avoid leaking details
  const isProd = env.NODE_ENV === "production";
  const errorMessage = isMalformedJson
    ? "Malformed JSON request body. Use valid JSON with double-quoted property names."
    : isProd && statusCode === 500
      ? "Internal Server Error"
      : err.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
};
