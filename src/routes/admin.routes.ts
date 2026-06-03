// src/routes/admin.routes.ts
import express, { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { clerkAuthMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const route = express.Router();

// All admin routes require authentication + admin role
route.use(clerkAuthMiddleware);
route.use(requireAdmin);

route.get("/refunds/pending", async (_req: Request, res: Response) => {
  try {
    const pendingRefunds = await prisma.refundRequest.findMany({
      where: { status: "PENDING" },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: pendingRefunds });
  } catch (error) {
    logger.error(error, "Error fetching pending refunds");
    res.status(500).json({ success: false, error: "Failed to fetch pending refunds" });
  }
});

route.post("/refunds/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const adminUserId = (req as any).userId as string;

    const refund = await prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!refund) {
      res.status(404).json({ success: false, error: "Refund request not found" });
      return;
    }

    if (refund.status !== "PENDING") {
      res.status(400).json({ success: false, error: `Refund already ${refund.status}` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refundRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedBy: adminUserId },
      });

      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: "REFUNDED" },
      });

      return updatedRefund;
    });

    logger.info(`Refund ${id} approved by admin ${adminUserId}`);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error, "Error approving refund");
    res.status(500).json({ success: false, error: "Failed to approve refund" });
  }
});

route.post("/refunds/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const adminUserId = (req as any).userId as string;
    const refund = await prisma.refundRequest.findUnique({ where: { id } });

    if (!refund) {
      res.status(404).json({ success: false, error: "Refund request not found" });
      return;
    }

    if (refund.status !== "PENDING") {
      res.status(400).json({ success: false, error: `Refund already ${refund.status}` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refundRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedBy: adminUserId },
      });

      // Only reset order status if it's currently REFUND_PENDING_APPROVAL
      const order = await tx.order.findUnique({ where: { id: refund.orderId } });
      if (order && order.status === "REFUND_PENDING_APPROVAL") {
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: "DELIVERED" },
        });
      }

      return updatedRefund;
    });

    logger.info(`Refund ${id} rejected by admin ${adminUserId}`);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error, "Error rejecting refund");
    res.status(500).json({ success: false, error: "Failed to reject refund" });
  }
});

route.get("/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await prisma.lLMOpsMetric.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const totalCostUSD = metrics.reduce((sum, m) => sum + m.costUSD, 0);
    const totalCostINR = metrics.reduce((sum, m) => sum + m.costINR, 0);
    const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const avgLatency = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.latencyMs, 0) / metrics.length
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests: metrics.length,
          totalCostUSD: parseFloat(totalCostUSD.toFixed(4)),
          totalCostINR: parseFloat(totalCostINR.toFixed(2)),
          totalTokens,
          avgLatencyMs: Math.round(avgLatency),
        },
        recent: metrics.slice(0, 20),
      },
    });
  } catch (error) {
    logger.error(error, "Error fetching metrics");
    res.status(500).json({ success: false, error: "Failed to fetch metrics" });
  }
});

route.get("/customers", async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    logger.error(error, "Error fetching customers");
    res.status(500).json({ success: false, error: "Failed to fetch customers" });
  }
});

export default route;
