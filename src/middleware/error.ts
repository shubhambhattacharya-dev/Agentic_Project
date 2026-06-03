import { ErrorRequestHandler } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "../config/logger.js";

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

  // Never leak internal paths or stack traces to the client
  const safeMessage = (msg: string): string => {
    // Strip Windows/Unix file paths from error messages
    return msg.replace(/[A-Z]:\\[^\s]+/g, "[path]").replace(/\/[a-z]+\/[^\s]+/g, "[path]");
  };

  const errorMessage = isMalformedJson
    ? "Malformed JSON request body. Use valid JSON with double-quoted property names."
    : statusCode >= 500
      ? "Internal Server Error"
      : safeMessage(err.message) || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
};
