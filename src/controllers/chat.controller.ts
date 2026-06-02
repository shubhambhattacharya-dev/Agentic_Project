import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AgentService } from '../modules/agent/agent.service.js';
import { toolRegistry } from '../modules/tools/tool.registry.js';
import { ChatMessageSchema } from '../modules/agent/agent.types.js';
import { logger } from '../config/logger.js';

const ChatMessageInputSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content cannot be empty').max(4000, 'Message exceeds maximum length'),
});

const ChatRequestBodySchema = z.object({
  sessionId: z.string().min(1).max(256),
  messages: z.array(ChatMessageInputSchema).min(1, 'At least one message is required').max(50, 'Too many messages'),
  customerEmail: z.string().email('Invalid email format').optional(),
});

export async function chatController(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();

  try {
    const parsed = ChatRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join('; '),
      });
      return;
    }

    const { messages, sessionId, customerEmail } = parsed.data;

    const agent = new AgentService(toolRegistry);

    const customerContext = customerEmail
      ? { customerId: '', customerEmail, role: 'customer' as const }
      : undefined;

    // Map frontend messages to agent ChatMessage format
    const agentMessages = messages.map((m) =>
      ChatMessageSchema.parse({ role: m.role, content: m.content })
    );

    const result = await agent.run({
      sessionId,
      customerContext,
      messages: agentMessages,
    });

    const latencyMs = Date.now() - startTime;

    logger.info(
      { sessionId, customerEmail, latencyMs },
      'Chat request completed'
    );

    res.status(200).json({
      success: true,
      data: {
        message: result.message,
        sessionId: sessionId ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
}