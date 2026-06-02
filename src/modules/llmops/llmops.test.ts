import { describe, it, expect } from 'vitest';
import { calculateCost } from './llmops.service.js';

describe('LLMOpsService', () => {
  it('should calculate cost correctly for llama-3.3-70b-versatile', () => {
    const model = 'llama-3.3-70b-versatile';
    const promptTokens = 1000;
    const completionTokens = 500;
    
    const report = calculateCost(model, promptTokens, completionTokens);
    
    // 70b rates: input 0.59, output 0.79 per 1M
    const expectedUSD = (1000/1000000 * 0.59) + (500/1000000 * 0.79);
    expect(report.costUSD).toBeCloseTo(expectedUSD, 6);
    expect(report.totalTokens).toBe(1500);
  });

  it('should fallback to default pricing for unknown models', () => {
    const report = calculateCost('unknown-model', 1000, 500);
    expect(report.costUSD).toBeGreaterThan(0);
  });
});
