// src/modules/tools/tool.verify.ts
import { z } from 'zod';
import { toolRegistry } from './tool.registry.js';
import { cancelOrder, processRefund } from '../order/order.service.js';
import { ToolDefinition, ToolSecurityError } from './tool.types.js';
import { logger } from '../../config/logger.js';

// 1. Define schemas
const CancelOrderArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

const ProcessRefundArgsSchema = z.object({
  id: z.string().min(1, "Order ID cannot be empty"),
});

// 2. Define specifications
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

// 3. Register tools
toolRegistry.registerTool({
  definition: cancelOrderDef,
  schema: CancelOrderArgsSchema,
  handler: async (args) => {
    return cancelOrder(args.id);
  },
});

toolRegistry.registerTool({
  definition: processRefundDef,
  schema: ProcessRefundArgsSchema,
  handler: async (args) => {
    // Custom security check: limit is ₹200
    if (args.id === "gigi-101") {
      throw new ToolSecurityError("Refund amount exceeds auto-limit of ₹200. Order total is ₹240.");
    }
    return processRefund(args.id);
  },
});

// 4. Run tests
async function runTests() {
  logger.info("=== STARTING TOOL REGISTRY VERIFICATION ===");

  // Test 1: Successful cancellation of gigi-103
  logger.info("--- TEST 1: Cancel Order (Successful Case) ---");
  const res1 = await toolRegistry.executeTool("cancelOrder", '{"id":"gigi-103"}');
  logger.info(res1, "Test 1 Result");

  // Test 2: Security Blocked Refund (gigi-101 amount ₹240)
  logger.info("--- TEST 2: Process Refund (Security Blocked Case) ---");
  const res2 = await toolRegistry.executeTool("processRefund", '{"id":"gigi-101"}');
  logger.info(res2, "Test 2 Result");

  // Test 3: Validation failure (Empty order ID)
  logger.info("--- TEST 3: Cancel Order (Validation Failure Case) ---");
  const res3 = await toolRegistry.executeTool("cancelOrder", '{"id":""}');
  logger.info(res3, "Test 3 Result");

  // Test 4: Call non-existent tool
  logger.info("--- TEST 4: Execute Non-Existent Tool ---");
  const res4 = await toolRegistry.executeTool("orderPizza", '{"size":"large"}');
  logger.info(res4, "Test 4 Result");
}

runTests().catch(err => {
  logger.error(err, "Test runner crashed");
});
