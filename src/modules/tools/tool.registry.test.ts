import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolSecurityError } from './tool.types.js';

// We need to test the ToolRegistry class directly.
// Import after clearing the singleton state.
import { ToolRegistry } from './tool.registry.js';
import { z } from 'zod';

const TestSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

const testDef = {
  type: 'function' as const,
  function: {
    name: 'testTool',
    description: 'A test tool',
    parameters: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, description: 'Test ID' },
      },
      required: ['id'],
    },
  },
};

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registerTool', () => {
    it('registers a tool successfully', () => {
      registry.registerTool({
        definition: testDef,
        schema: TestSchema,
        handler: vi.fn().mockResolvedValue({ success: true }),
      });

      const defs = registry.getDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].function.name).toBe('testTool');
    });

    it('throws ToolSecurityError on duplicate registration', () => {
      registry.registerTool({
        definition: testDef,
        schema: TestSchema,
        handler: vi.fn(),
      });

      expect(() => {
        registry.registerTool({
          definition: testDef,
          schema: TestSchema,
          handler: vi.fn(),
        });
      }).toThrow(ToolSecurityError);
    });

    it('registers multiple distinct tools', () => {
      registry.registerTool({
        definition: testDef,
        schema: TestSchema,
        handler: vi.fn(),
      });

      registry.registerTool({
        definition: {
          ...testDef,
          function: { ...testDef.function, name: 'secondTool', description: 'Second' },
        },
        schema: TestSchema,
        handler: vi.fn(),
      });

      expect(registry.getDefinitions()).toHaveLength(2);
    });
  });

  describe('executeTool', () => {
    it('executes a registered tool with valid args', async () => {
      const handler = vi.fn().mockResolvedValue({ orderId: 'gigi-101' });
      registry.registerTool({ definition: testDef, schema: TestSchema, handler });

      const result = await registry.executeTool('testTool', '{"id":"gigi-101"}');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ orderId: 'gigi-101' });
      expect(handler).toHaveBeenCalledWith({ id: 'gigi-101' }, undefined);
    });

    it('returns error for unregistered tool', async () => {
      const result = await registry.executeTool('nonexistent', '{}');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error for invalid JSON arguments', async () => {
      registry.registerTool({ definition: testDef, schema: TestSchema, handler: vi.fn() });

      const result = await registry.executeTool('testTool', 'not-json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns validation error for args that fail schema', async () => {
      registry.registerTool({ definition: testDef, schema: TestSchema, handler: vi.fn() });

      const result = await registry.executeTool('testTool', '{"id":""}');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('returns securityBlocked when handler throws ToolSecurityError', async () => {
      registry.registerTool({
        definition: testDef,
        schema: TestSchema,
        handler: vi.fn().mockRejectedValue(new ToolSecurityError('Access denied')),
      });

      const result = await registry.executeTool('testTool', '{"id":"x"}');

      expect(result.success).toBe(false);
      expect(result.securityBlocked).toBe(true);
    });

    it('returns generic error when handler throws non-security error', async () => {
      registry.registerTool({
        definition: testDef,
        schema: TestSchema,
        handler: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      });

      const result = await registry.executeTool('testTool', '{"id":"x"}');

      expect(result.success).toBe(false);
      expect(result.securityBlocked).toBe(false);
      expect(result.error).toBe('Internal tool error');
    });

    it('passes context to handler', async () => {
      const handler = vi.fn().mockResolvedValue({});
      registry.registerTool({ definition: testDef, schema: TestSchema, handler });

      const ctx = { customerId: 'cust-001', role: 'customer' as const };
      await registry.executeTool('testTool', '{"id":"x"}', ctx);

      expect(handler).toHaveBeenCalledWith({ id: 'x' }, ctx);
    });
  });

  describe('getDefinitions', () => {
    it('returns empty array when no tools registered', () => {
      expect(registry.getDefinitions()).toEqual([]);
    });
  });
});
