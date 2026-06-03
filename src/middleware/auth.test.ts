import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }),
    },
  },
  verifyToken: vi.fn(),
}));

vi.mock('../config/env.js', () => ({
  env: {
    CLERK_SECRET_KEY: 'sk_test_mock',
    NODE_ENV: 'test',
  },
}));

vi.mock('../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { clerkAuthMiddleware, optionalAuthMiddleware } from './auth.js';
import { verifyToken } from '@clerk/express';

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers, path: '/api/test' } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('clerkAuthMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no Authorization header', async () => {
    const { req, res, next } = mockReqRes();
    await clerkAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is malformed', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Basic abc123' });
    await clerkAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    (verifyToken as any).mockRejectedValue(new Error('Invalid token'));
    const { req, res, next } = mockReqRes({ authorization: 'Bearer bad-token' });
    await clerkAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets userId when token is valid', async () => {
    (verifyToken as any).mockResolvedValue({ sub: 'user_123' });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid-token' });
    await clerkAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).userId).toBe('user_123');
    expect((req as any).userEmail).toBe('test@example.com');
  });

  it('skips auth for /api/health path', async () => {
    const req = { headers: {}, path: '/api/health' } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();
    await clerkAuthMiddleware(req, res, next as NextFunction);
    expect(next).toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls next() even without Authorization header', async () => {
    const { req, res, next } = mockReqRes();
    await optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets userId when valid token is provided', async () => {
    (verifyToken as any).mockResolvedValue({ sub: 'user_456' });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid-token' });
    await optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).userId).toBe('user_456');
  });

  it('calls next() even when token is invalid', async () => {
    (verifyToken as any).mockRejectedValue(new Error('Invalid'));
    const { req, res, next } = mockReqRes({ authorization: 'Bearer bad' });
    await optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
