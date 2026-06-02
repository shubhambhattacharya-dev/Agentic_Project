// src/modules/tools/tool.init.ts
import { z } from 'zod';
import { toolRegistry, ToolContext } from './tool.registry.js';
import { cancelOrder, processRefund, getOrderById } from '../order/order.service.js';
import { ToolDefinition } from './tool.types.js';
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
    description: "Process a refund for a D2C order by its ID, refund reason, and damage claim status.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Order ID (e.g. gigi-101)" },
        reason: { type: "string", description: "Customer-provided refund reason." },
        damageClaim: { type: "boolean", description: "True if the customer says the item was damaged." },
      },
      required: ["id", "reason", "damageClaim"],
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
  reason: z.string().trim().min(1, "Refund reason cannot be empty"),
  damageClaim: z.boolean(),
});

const GetOrderArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

/**
 * Initializes and registers all customer support agent tools.
 * Tools receive authenticated context for ownership validation.
 */
export function initializeTools(): void {
  logger.info("Initializing and registering tools in registry...");

  // Register cancelOrder — with ownership check
  toolRegistry.registerTool({
    definition: cancelOrderDef,
    schema: CancelOrderArgsSchema,
    handler: async (args, context?: ToolContext) => {
      return cancelOrder(args.id, context?.customerId);
    },
  });

  // Register processRefund — with ownership check
  toolRegistry.registerTool({
    definition: processRefundDef,
    schema: ProcessRefundArgsSchema,
    handler: async (args, context?: ToolContext) => {
      return processRefund(args.id, args.reason, args.damageClaim, context?.customerId);
    },
  });

  // Register getOrder — with ownership check
  toolRegistry.registerTool({
    definition: getOrderDef,
    schema: GetOrderArgsSchema,
    handler: async (args, context?: ToolContext) => {
      const order = await getOrderById(args.id, context?.customerId);
      if (!order) return { success: false, error: `Order ${args.id} not found.` };
      return { success: true, order };
    },
  });

  logger.info("All tools successfully initialized.");
}
