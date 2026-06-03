import express, { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { clerkAuthMiddleware } from "../middleware/auth.js";
import { clerkClient } from "@clerk/express";

const route = express.Router();

route.use(clerkAuthMiddleware);

const customerInclude = {
  orders: {
    include: {
      items: { include: { product: true } },
      refunds: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
};

// GET /api/account/me
route.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const userEmail = (req as any).userEmail as string | undefined;

    if (!userId) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    // 1. Try lookup by clerkId
    let customer = await prisma.customer.findUnique({
      where: { clerkId: userId },
      include: customerInclude,
    });

    // 2. Try lookup by email and link clerkId
    if (!customer && userEmail) {
      customer = await prisma.customer.findUnique({
        where: { email: userEmail },
        include: customerInclude,
      });

      if (customer && !customer.clerkId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { clerkId: userId },
        });
      }
    }

    // 3. Determine role from existing DB record or default to CUSTOMER
    let role = customer?.role ?? "CUSTOMER";

    // 4. If no customer exists, check Clerk metadata for role before creating
    if (!customer) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const clerkRole = (clerkUser.publicMetadata?.role as string)?.toUpperCase();
        if (clerkRole === "ADMIN") {
          role = "ADMIN";
        }
      } catch {
        // Clerk lookup failed, use default CUSTOMER
      }

      const email = userEmail ?? "unknown@example.com";
      customer = await prisma.customer.upsert({
        where: { email },
        update: { clerkId: userId, role },
        create: {
          clerkId: userId,
          email,
          name: "Customer",
          role,
        },
        include: customerInclude,
      });
      logger.info(`Customer upserted for: ${email} with role: ${role}`);
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
    const userId = (req as any).userId as string | undefined;

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
