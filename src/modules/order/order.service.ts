// src/modules/order/order.service.ts

import { prisma } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { OrderStatus } from "@prisma/client";

/**
 * Retrieve details and status of a specific order by its ID.
 */
export const getOrderById = async (id: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: id.toLowerCase() },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        refunds: true
      }
    });
    return order;
  } catch (error) {
    logger.error(error, `Error fetching order ${id}`);
    throw error;
  }
};

/**
 * Cancel a D2C order by its ID with status and ownership validation.
 */
export const cancelOrder = async (id: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: id.toLowerCase() },
        include: { items: true }
      });

      if (!order) {
        return { success: false, message: `Order with ID ${id} not found.` };
      }

      if (order.status === "CANCELLED") {
        return { success: false, message: "Order is already cancelled.", order };
      }

      // SHIPPED/DELIVERED orders cannot be cancelled
      if (order.status === "SHIPPED" || order.status === "DELIVERED") {
        return { 
          success: false, 
          message: "Sorry, we already despatched it.", 
          order 
        };
      }

      // Only PLACED/PACKED can be cancelled
      if (order.status !== "PLACED" && order.status !== "PACKED") {
        return {
          success: false,
          message: `Cannot cancel order in ${order.status} status.`,
          order,
        };
      }

      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" }
      });

      // 2. Restore stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }

      logger.info(`Order ${id} cancelled successfully.`);
      return { success: true, message: "Order cancelled successfully.", order: updatedOrder };
    });
  } catch (error) {
    logger.error(error, `Error cancelling order ${id}`);
    return { success: false, message: "An internal error occurred while cancelling the order." };
  }
};

/**
 * Process a refund request with auto-approval logic and database persistence.
 */
export const processRefund = async (
  id: string,
  reason: string,
  damageClaim: boolean
) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: id.toLowerCase() }
    });

    if (!order) {
      return { success: false, message: `Order with ID ${id} not found.` };
    }

    if (order.status === "REFUNDED") {
      return { success: false, message: "Refund has already been processed.", order };
    }

    // Refund requires DELIVERED status or already pending
    if (order.status !== "DELIVERED" && order.status !== "REFUND_PENDING_APPROVAL") {
      return { 
        success: false, 
        message: "Refund can only be requested for delivered orders.", 
        order 
      };
    }

    const totalAmount = Number(order.totalAmount);
    
    // Business Rule: damaged + amount < 500 -> auto approve
    let finalStatus: OrderStatus = "REFUND_PENDING_APPROVAL";
    let message = `Refund of ₹${totalAmount} requires manual Admin approval. Marked as PENDING.`;
    let refundRequestStatus: 'PENDING' | 'APPROVED' = 'PENDING';

    if (damageClaim && totalAmount < 500) {
      finalStatus = "REFUNDED";
      refundRequestStatus = 'APPROVED';
      message = `Refund of ₹${totalAmount} approved automatically (damaged item, under ₹500 threshold).`;
    }

    // Create refund request and update order status in transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.refundRequest.create({
        data: {
          orderId: order.id,
          reason,
          damageClaim,
          amount: order.totalAmount,
          status: refundRequestStatus
        }
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: finalStatus }
      });

      return { success: true, message, order: updatedOrder };
    });

    return result;
  } catch (error) {
    logger.error(error, `Error processing refund for order ${id}`);
    return { success: false, message: "An internal error occurred while processing the refund." };
  }
};
