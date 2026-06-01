import { AgentService } from "../modules/agent/agent.service.js";
import { toolRegistry } from "../modules/tools/tool.registry.js";

import { z } from "zod";
import { logger } from "../config/logger.js";

const agentService = new AgentService(toolRegistry);

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

export async function chatController(req: any, res: any) {
  const validation = ChatRequestSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.flatten(),
    });
  }

  const messages = [
    {
      role: "user",
      content: validation.data.message,
    },
  ];

  try {
    const result = await agentService.run({ messages });

    return res.status(200).json({
      success: true,
      reply: result.message,
    });
  } catch (error: any) {
    logger.error(error, "Agent run failed");

    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again",
    });
  }
}