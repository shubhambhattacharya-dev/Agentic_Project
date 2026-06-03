import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../modules/agent/agent.service.js', () => ({
  AgentService: vi.fn().mockImplementation(function () { return { run: vi.fn().mockResolvedValue({ message: 'Order gigi-101 cancelled successfully.', messageHistory: [] }) }; }),
}));

vi.mock('../modules/tools/tool.registry.js', () => ({
  toolRegistry: { getDefinitions: () => [], executeTool: vi.fn() },
}));

vi.mock('../config/db.js', () => ({
  prisma: {
    agentSession: { upsert: vi.fn().mockResolvedValue({ id: 'sess-1' }) },
    agentMessage: { create: vi.fn() },
    customer: { findFirst: vi.fn().mockResolvedValue({ id: 'cust-1', name: 'Shubham', email: 'test@example.com', role: 'CUSTOMER' }) },
  },
}));

vi.mock('../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../modules/agent/agent.types.js', async () => {
  const { z } = await import('zod');
  return {
    ChatMessageSchema: z.object({ role: z.enum(['user', 'assistant', 'system', 'tool']), content: z.string().min(1) }),
  };
});

import { chatController } from './chat.controller.js';

function mockReqRes(overrides: Partial<Request> = {}) {
  const req = {
    body: {},
    path: '/api/chat',
    ...overrides,
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('chatController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when body is missing messages', async () => {
    const { req, res, next } = mockReqRes({ body: { sessionId: 's1' } });
    await chatController(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when messages array is empty', async () => {
    const { req, res, next } = mockReqRes({ body: { sessionId: 's1', messages: [] } });
    await chatController(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when message content is empty', async () => {
    const { req, res, next } = mockReqRes({
      body: { sessionId: 's1', messages: [{ role: 'user', content: '' }] },
    });
    await chatController(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when userId is missing', async () => {
    const { req, res, next } = mockReqRes({
      body: { sessionId: 's1', messages: [{ role: 'user', content: 'Hello' }] },
    });
    await chatController(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 with agent response on valid request', async () => {
    const { req, res, next } = mockReqRes({
      body: { sessionId: 's1', messages: [{ role: 'user', content: 'Cancel my order' }] },
    });
    (req as any).userId = 'user_123';
    (req as any).userEmail = 'test@example.com';

    await chatController(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          message: expect.stringContaining('cancelled'),
        }),
      })
    );
  });

  it('calls next(error) when agent throws', async () => {
    const { AgentService } = await import('../modules/agent/agent.service.js');
    (AgentService as any).mockImplementation(function () { return { run: vi.fn().mockRejectedValue(new Error('Groq down')) }; });

    const { req, res, next } = mockReqRes({
      body: { sessionId: 's1', messages: [{ role: 'user', content: 'Hello' }] },
    });
    (req as any).userId = 'user_123';

    await chatController(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

