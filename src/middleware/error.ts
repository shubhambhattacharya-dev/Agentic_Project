import { ErrorRequestHandler } from "express";
import { logger } from "../config/logger.js";

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler: ErrorRequestHandler = (err: AppError, req, res, next) => {
  logger.error(err, `[SERVER ERROR]: ${err.message}`);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
};