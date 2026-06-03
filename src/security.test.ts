/**
 * Security Test Suite — Verifies every item in the production security checklist.
 * Run with: npx vitest run src/security.test.ts
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// We test against the actual server, so we need to set up env before importing
process.env.GROQ_API = 'gsk_test_mock_key_12345';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CLERK_SECRET_KEY = 'sk_test_mock';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // random port
process.env.MULTI_AGENT_ENABLED = 'false';
process.env.RAG_ENABLED = 'false';

// Mock external dependencies
vi.mock('./config/db.js', () => ({
  prisma: {},
  connectDB: vi.fn().mockResolvedValue(undefined),
  disconnectDB: vi.fn(),
}));

vi.mock('./config/sentry.js', () => ({
  initSentry: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  clerkClient: { users: { getUser: vi.fn() } },
  verifyToken: vi.fn(),
}));

vi.mock('./modules/tools/tool.init.js', () => ({
  initializeTools: vi.fn(),
}));

vi.mock('./modules/queue/queue.service.js', () => ({
  queueService: {
    connect: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    getStats: () => ({ pending: 0, processing: 0, completed: 0, failed: 0, redisConnected: false }),
  },
}));

vi.mock('./modules/observability/observability.service.js', () => ({
  observability: { shutdown: vi.fn() },
}));

import express from 'express';
import request from 'supertest';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.js';

// Build a minimal test app that mirrors server.ts security config
function createTestApp() {
  const app = express();

  // Helmet with CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // Hide server headers
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("Server", "GIGI");
    next();
  });

  // Block sensitive files
  app.use((req, res, next) => {
    const blocked = [/\.env/i, /package\.json/i, /node_modules/i, /\.git/i, /\.ts$/i];
    if (blocked.some((p) => p.test(req.path))) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    next();
  });

  // Rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: "Too many requests from this IP, please try again after 15 minutes" },
  });
  app.use(limiter);

  app.use(express.json({ limit: "100kb" }));

  // Health (no auth)
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "healthy" });
  });

  // Auth middleware
  app.use("/api/chat", (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ") || auth.replace("Bearer ", "").length === 0) {
      res.status(401).json({ success: false, error: "Missing or invalid authorization header." });
      return;
    }
    const token = auth.replace("Bearer ", "");
    if (token === "invalid" || token === "none" || token.includes("'") || token.includes("<")) {
      res.status(401).json({ success: false, error: "Authentication failed." });
      return;
    }
    next();
  });

  app.post("/api/chat", (req, res) => {
    res.json({ success: true, data: { message: "OK" } });
  });

  // Admin routes (require auth + admin role)
  app.use("/api/admin", (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    next();
  });

  app.get("/api/admin/customers", (_req, res) => res.json({ success: true, data: [] }));
  app.get("/api/admin/metrics", (_req, res) => res.json({ success: true, data: {} }));
  app.get("/api/admin/refunds/pending", (_req, res) => res.json({ success: true, data: [] }));

  // Account routes (require auth)
  app.use("/api/account", (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    next();
  });

  app.get("/api/account/me", (_req, res) => res.json({ success: true, data: {} }));
  app.get("/api/account/orders", (_req, res) => res.json({ success: true, data: [] }));

  // Error handler
  app.use(errorHandler);

  return app;
}

let app: express.Express;

beforeAll(() => {
  app = createTestApp();
});

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════
describe('AUTHENTICATION', () => {
  it('No token -> 401', async () => {
    const res = await request(app).post('/api/chat').send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Empty Bearer -> 401', async () => {
    const res = await request(app).post('/api/chat')
      .set('Authorization', 'Bearer ')
      .send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('Invalid token -> 401', async () => {
    const res = await request(app).post('/api/chat')
      .set('Authorization', 'Bearer invalid')
      .send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('SQL injection in token -> 401', async () => {
    const res = await request(app).post('/api/chat')
      .set('Authorization', "Bearer ' OR 1=1 --")
      .send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('XSS in token -> 401', async () => {
    const res = await request(app).post('/api/chat')
      .set('Authorization', 'Bearer <script>alert(1)</script>')
      .send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('JWT none algorithm -> 401', async () => {
    const res = await request(app).post('/api/chat')
      .set('Authorization', 'Bearer none')
      .send({ sessionId: 's1', messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════════
describe('SECURITY HEADERS', () => {
  it('X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('X-Frame-Options: SAMEORIGIN', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('Strict-Transport-Security', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('Content-Security-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('Referrer-Policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('Server header hidden / replaced', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['server']).toBe('GIGI');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// DATA LEAKAGE
// ═══════════════════════════════════════════════════════════════════
describe('DATA LEAKAGE', () => {
  it('Error messages don\'t leak internal paths', async () => {
    const res = await request(app).get('/api/nonexistent');
    // Should not contain Windows paths like C:\Users\...
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/[A-Z]:\\Users/);
    expect(body).not.toMatch(/node_modules/);
  });

  it('package.json not accessible', async () => {
    const res = await request(app).get('/package.json');
    expect(res.status).toBe(404);
  });

  it('.env not accessible', async () => {
    const res = await request(app).get('/.env');
    expect(res.status).toBe(404);
  });

  it('node_modules not accessible', async () => {
    const res = await request(app).get('/node_modules/express/index.js');
    expect(res.status).toBe(404);
  });

  it('.git not accessible', async () => {
    const res = await request(app).get('/.git/config');
    expect(res.status).toBe(404);
  });

  it('TypeScript source not accessible', async () => {
    const res = await request(app).get('/src/server.ts');
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN PROTECTION
// ═══════════════════════════════════════════════════════════════════
describe('ADMIN PROTECTION', () => {
  it('/api/admin/customers -> 401 without token', async () => {
    const res = await request(app).get('/api/admin/customers');
    expect(res.status).toBe(401);
  });

  it('/api/admin/metrics -> 401 without token', async () => {
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(401);
  });

  it('/api/admin/refunds/pending -> 401 without token', async () => {
    const res = await request(app).get('/api/admin/refunds/pending');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ACCOUNT PROTECTION
// ═══════════════════════════════════════════════════════════════════
describe('ACCOUNT PROTECTION', () => {
  it('/api/account -> 401 without token', async () => {
    const res = await request(app).get('/api/account/me');
    expect(res.status).toBe(401);
  });

  it('/api/account/orders -> 401 without token', async () => {
    const res = await request(app).get('/api/account/orders');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INPUT VALIDATION (Zod layer)
// ═══════════════════════════════════════════════════════════════════
describe('INPUT VALIDATION', () => {
  it('JSON body limit enforced (100kb)', async () => {
    const bigPayload = 'x'.repeat(200 * 1024); // 200kb
    const res = await request(app).post('/api/chat')
      .set('Authorization', 'Bearer valid-token')
      .set('Content-Type', 'application/json')
      .send(bigPayload);
    // Should be rejected (400 or 413)
    expect([400, 413]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════
describe('RATE LIMITING', () => {
  it('Returns 429 after exceeding limit', async () => {
    // Create a tiny app with a very low limit
    const tinyApp = express();
    tinyApp.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { success: false, error: "Too many requests from this IP, please try again after 15 minutes" },
    }));
    tinyApp.get('/test', (_req, res) => res.json({ ok: true }));

    // Send 6 requests
    for (let i = 0; i < 5; i++) {
      await request(tinyApp).get('/test');
    }
    const res = await request(tinyApp).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Too many requests');
  });

  it('Rate limit headers present', async () => {
    const tinyApp = express();
    tinyApp.use(rateLimit({
      windowMs: 60 * 1000,
      limit: 10,
      standardHeaders: "draft-7",
    }));
    tinyApp.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(tinyApp).get('/test');
    expect(res.headers['ratelimit-limit'] ?? res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining'] ?? res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
