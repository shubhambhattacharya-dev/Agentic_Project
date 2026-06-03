// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { clerkClient, verifyToken } from "@clerk/express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// Extended request type with Clerk auth fields
interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: "customer" | "admin";
}

/**
 * Clerk authentication middleware.
 * Verifies the JWT token from the Authorization header.
 */
export async function clerkAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.path === "/api/health") {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header. Please sign in.",
    });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    if (!verifiedToken || !verifiedToken.sub) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token.",
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.userId = verifiedToken.sub;

    try {
      const user = await clerkClient.users.getUser(verifiedToken.sub);
      authReq.userEmail = user.emailAddresses?.[0]?.emailAddress;
    } catch {
      logger.debug("Could not fetch user email from Clerk");
    }

    next();
  } catch (error) {
    logger.error(error, "Clerk auth verification failed");
    res.status(401).json({
      success: false,
      error: "Authentication failed. Please sign in again.",
    });
  }
}

/**
 * Optional auth middleware — does not block unauthenticated requests.
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    if (verifiedToken?.sub) {
      const authReq = req as AuthenticatedRequest;
      authReq.userId = verifiedToken.sub;

      try {
        const user = await clerkClient.users.getUser(verifiedToken.sub);
        authReq.userEmail = user.emailAddresses?.[0]?.emailAddress;
      } catch {
        // Ignore
      }
    }
  } catch {
    // Token invalid — continue without auth
  }

  next();
}
