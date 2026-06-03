// src/modules/llmops/llmops.service.ts

import { get_encoding } from "tiktoken";
import { z } from "zod";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/db.js";

const USD_TO_INR = 85;

const PRICING: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.3-8b-instant": { input: 0.05, output: 0.08 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "default": { input: 0.59, output: 0.79 },
};

export const TokenUsageReportSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUSD: z.number().nonnegative(),
  costINR: z.number().nonnegative(),
});

export type TokenUsageReport = z.infer<typeof TokenUsageReportSchema>;

export function countTokensLocal(text: string): number {
  const encoder = get_encoding("cl100k_base");
  try {
    return encoder.encode(text).length;
  } finally {
    encoder.free();
  }
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): TokenUsageReport {
  const cleanModel = model.trim().toLowerCase();
  
  let rates = PRICING["default"];
  if (cleanModel.includes("70b")) {
    rates = PRICING["llama-3.3-70b-versatile"];
  } else if (cleanModel.includes("8b")) {
    rates = PRICING["llama-3.1-8b-instant"];
  }

  const promptCostUSD = (promptTokens / 1_000_000) * rates.input;
  const completionCostUSD = (completionTokens / 1_000_000) * rates.output;
  const totalCostUSD = promptCostUSD + completionCostUSD;
  const totalCostINR = totalCostUSD * USD_TO_INR;

  return TokenUsageReportSchema.parse({
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUSD: parseFloat(totalCostUSD.toFixed(6)),
    costINR: parseFloat(totalCostINR.toFixed(4)),
  });
}

export function logLLMUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
  isEstimate: boolean = false
): TokenUsageReport {
  const report = calculateCost(model, promptTokens, completionTokens);
  const typeLabel = isEstimate ? "ESTIMATE" : "ACTUAL";
  
  logger.info(
    {
      metrics: {
        model,
        promptTokens: report.promptTokens,
        completionTokens: report.completionTokens,
        totalTokens: report.totalTokens,
        costUSD: report.costUSD,
        costINR: report.costINR,
      },
    },
    `LLMOps Metrics [${typeLabel}] - ${model}`
  );

  return report;
}

// Save LLMOps metric to database
export async function saveLLMOpsMetric(data: {
  sessionId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  costINR: number;
  latencyMs: number;
}): Promise<void> {
  try {
    await prisma.lLMOpsMetric.create({
      data: {
        sessionId: data.sessionId,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        costUSD: data.costUSD,
        costINR: data.costINR,
        latencyMs: data.latencyMs,
      },
    });
    logger.info(`LLMOps metric saved to DB for session ${data.sessionId}`);
  } catch (error) {
    logger.warn(error, 'Failed to save LLMOps metric to DB');
  }
}
