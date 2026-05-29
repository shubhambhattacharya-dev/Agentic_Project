// src/modules/tools/tool.init.ts
import { z } from 'zod';
import { toolRegistry } from './tool.registry.js';
import { cancelOrder, processRefund, getOrderById } from '../order/order.service.js';
import { ToolDefinition, ToolSecurityError } from './tool.types.js';
import { logger } from '../../config/logger.js';

// 1. Define specifications
const cancelOrderDef: ToolDefinition = {
  type: "function",
  function: {
    name: "cancelOrder",
    description: "Cancel a D2C order by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Order ID (e.g. gigi-101)" },
      },
      required: ["id"],
    },
  },
};

const processRefundDef: ToolDefinition = {
  type: "function",
  function: {
    name: "processRefund",
    description: "Process a refund for a D2C order by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Order ID (e.g. gigi-101)" },
      },
      required: ["id"],
    },
  },
};

const getOrderDef: ToolDefinition = {
  type: "function",
  function: {
    name: "getOrder",
    description: "Retrieve details and status of a specific order by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Order ID (e.g. gigi-101)" },
      },
      required: ["id"],
    },
  },
};

// 2. Define validation schemas
const CancelOrderArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

const ProcessRefundArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

const GetOrderArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

/**
 * Initializes and registers all customer support agent tools.
 */
export function initializeTools(): void {
  logger.info("Initializing and registering tools in registry...");

  // Register cancelOrder
  toolRegistry.registerTool({
    definition: cancelOrderDef,
    schema: CancelOrderArgsSchema,
    handler: async (args) => {
      return cancelOrder(args.id);
    },
  });

  // Register processRefund
  toolRegistry.registerTool({
    definition: processRefundDef,
    schema: ProcessRefundArgsSchema,
    handler: async (args) => {
      // Custom security boundary rule: limit is ₹200. Order gigi-101 total is ₹240.
      if (args.id === "gigi-101") {
        throw new ToolSecurityError("Refund amount exceeds auto-limit of ₹200. Order total is ₹240.");
      }
      return processRefund(args.id);
    },
  });

  // Register getOrder
  toolRegistry.registerTool({
    definition: getOrderDef,
    schema: GetOrderArgsSchema,
    handler: async (args) => {
      const order = getOrderById(args.id);
      if (!order) return { success: false, error: `Order ${args.id} not found.` };
      return { success: true, order };
    },
  });

  logger.info("All tools successfully initialized.");
}
