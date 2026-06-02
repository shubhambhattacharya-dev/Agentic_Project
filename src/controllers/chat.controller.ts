import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AgentService } from '../modules/agent/agent.service.js';
import { toolRegistry } from '../modules/tools/tool.registry.js';
import { UserMessageSchema } from '../modules/agent/agent.types.js';
import { logger } from '../config/logger.js';

const ChatRequestBodySchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message exceeds maximum length'),
  sessionId: z.string().min(1).max(256).optional(),
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

    const { message, sessionId, customerEmail } = parsed.data;

    const agent = new AgentService(toolRegistry);

    const customerContext = customerEmail
      ? { customerId: '', customerEmail, role: 'customer' as const }
      : undefined;

    const result = await agent.run({
      sessionId,
      customerContext,
      messages: [UserMessageSchema.parse({ role: 'user', content: message })],
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
