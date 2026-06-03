import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";

/**
 * Shared admin authorization middleware.
 * Must run AFTER clerkAuthMiddleware so req.userId is populated.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (req as any).userId as string | undefined;

  if (!userId) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { clerkId: userId },
    });

    if (!customer || customer.role !== "ADMIN") {
      res.status(403).json({ success: false, error: "Admin access required" });
      return;
    }

    next();
  } catch (err) {
    logger.error(err, "Admin check failed");
    res.status(500).json({ success: false, error: "Authorization check failed" });
  }
}
