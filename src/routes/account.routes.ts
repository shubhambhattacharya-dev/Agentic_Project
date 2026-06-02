// src/routes/account.routes.ts
import express, { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { clerkAuthMiddleware } from "../middleware/auth.js";

const route = express.Router();

route.use(clerkAuthMiddleware);

// GET /api/account/me
route.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as Record<string, unknown>).userId as string | undefined;
    const userEmail = (req as unknown as Record<string, unknown>).userEmail as string | undefined;

    if (!userId) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    let customer = await prisma.customer.findUnique({
      where: { clerkId: userId },
      include: {
        orders: {
          include: {
            items: { include: { product: true } },
            refunds: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer && userEmail) {
      customer = await prisma.customer.findUnique({
        where: { email: userEmail },
        include: {
          orders: {
            include: {
              items: { include: { product: true } },
              refunds: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (customer && !customer.clerkId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { clerkId: userId },
        });
      }
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          clerkId: userId,
          email: userEmail ?? "unknown@example.com",
          name: "Customer",
          role: "CUSTOMER",
        },
        include: {
          orders: {
            include: {
              items: { include: { product: true } },
              refunds: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      logger.info(`New customer auto-created: ${userEmail}`);
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    logger.error(error, "Error fetching account");
    res.status(500).json({ success: false, error: "Failed to fetch account" });
  }
});

// GET /api/account/orders
route.get("/orders", async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as Record<string, unknown>).userId as string | undefined;

    if (!userId) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { clerkId: userId },
    });

    if (!customer) {
      res.json({ success: true, data: [] });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        items: { include: { product: true } },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error(error, "Error fetching orders");
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

export default route;
