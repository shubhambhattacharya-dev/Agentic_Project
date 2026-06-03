import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../tools/tool.registry.js', () => {
  return {
    ToolRegistry: class MockToolRegistry {
      getDefinitions() { return []; }
      executeTool = vi.fn();
      registerTool = vi.fn();
    },
    ToolContext: {},
  };
});

vi.mock('../llmops/llmops.service.js', () => ({
  logLLMUsage: vi.fn().mockReturnValue({ promptTokens: 100, completionTokens: 50, totalTokens: 150, costUSD: 0.001, costINR: 0.085 }),
  saveLLMOpsMetric: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    GROQ_API: 'gsk_test',
    GROQ_MODEL_LLM: 'llama-3.3-70b-versatile',
    GROQ_MODEL_SLM: 'llama-3.1-8b-instant',
  },
}));

vi.mock('../../config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../config/db.js', () => ({
  prisma: {
    agentSession: { upsert: vi.fn().mockResolvedValue({ id: 'sess-1' }) },
    agentMessage: { create: vi.fn() },
  },
}));

vi.mock('../ai/ai.service.js', () => ({
  groq: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

import { AgentService } from './agent.service.js';
import { ToolRegistry } from '../tools/tool.registry.js';
import { groq } from '../ai/ai.service.js';

describe('AgentService', () => {
  let agent: AgentService;
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ToolRegistry();
    agent = new AgentService(registry);
  });

  it('returns AI response for simple message', async () => {
    (groq.chat.completions.create as any).mockResolvedValue({
      choices: [{ message: { content: 'Hello! How can I help?', tool_calls: undefined } }],
      usage: { prompt_tokens: 50, completion_tokens: 20 },
    });

    const result = await agent.run({
      sessionId: 'test-session',
      customerContext: { customerId: 'cust-001', customerEmail: 'test@example.com', role: 'customer' },
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.message).toBe('Hello! How can I help?');
    expect(result.messageHistory.length).toBeGreaterThan(0);
  });

  it('handles empty AI response gracefully', async () => {
    (groq.chat.completions.create as any).mockResolvedValue({
      choices: [{ message: { content: null, tool_calls: undefined } }],
      usage: { prompt_tokens: 10, completion_tokens: 0 },
    });

    const result = await agent.run({
      customerContext: { customerId: 'cust-001', customerEmail: 'test@example.com', role: 'customer' },
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe('string');
  });

  it('falls back to SLM when LLM fails', async () => {
    (groq.chat.completions.create as any)
      .mockRejectedValueOnce(new Error('LLM overloaded'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Fallback response', tool_calls: undefined } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

    const result = await agent.run({
      customerContext: { customerId: 'cust-001', customerEmail: 'test@example.com', role: 'customer' },
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.message).toBe('Fallback response');
  });

  it('returns error message when both LLM and SLM fail', async () => {
    (groq.chat.completions.create as any)
      .mockRejectedValueOnce(new Error('LLM down'))
      .mockRejectedValueOnce(new Error('SLM also down'));

    const result = await agent.run({
      customerContext: { customerId: 'cust-001', customerEmail: 'test@example.com', role: 'customer' },
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result.message).toContain('unavailable');
  });

  it('respects max iterations limit with tool calls', async () => {
    // Mock 11 tool call responses (exceeds maxIterations=10)
    for (let i = 0; i < 11; i++) {
      (groq.chat.completions.create as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{ id: `tc_${i}`, function: { name: 'testTool', arguments: '{"id":"x"}' } }],
          },
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });
    }

    // Mock tool registry to return success
    (registry as any).executeTool = vi.fn().mockResolvedValue({ success: true, data: {} });

    const result = await agent.run({
      customerContext: { customerId: 'cust-001', customerEmail: 'test@example.com', role: 'customer' },
      messages: [{ role: 'user', content: 'test' }],
    });

    // Should stop at max iterations
    expect(result.message).toBeDefined();
  });
});
