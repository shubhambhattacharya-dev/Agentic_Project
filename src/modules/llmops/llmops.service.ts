// src/modules/llmops/llmops.service.ts

import { get_encoding } from "tiktoken";
import { z } from "zod";

// 🚀 Production Rule 1: Dollar to INR Exchange Rate
const USD_TO_INR = 83;

// 🚀 Production Rule 2: Pricing Table (per 1 Million tokens in USD)
const PRICING: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.3-8b-instant": { input: 0.05, output: 0.08 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "default": { input: 0.59, output: 0.79 },
};

// 🚀 Upgraded Zod Schema for Token Metrics (Your Suggestion!)
export const TokenUsageReportSchema = z.object({
  promptTokens: z.number().int().nonnegative("Input tokens cannot be negative"),
  completionTokens: z.number().int().nonnegative("Output tokens cannot be negative"),
  totalTokens: z.number().int().nonnegative("Total tokens cannot be negative"),
  costUSD: z.number().nonnegative("Cost in USD cannot be negative"),
  costINR: z.number().nonnegative("Cost in INR cannot be negative"),
});

export type TokenUsageReport = z.infer<typeof TokenUsageReportSchema>;

/**
 * Local Token Counter using tiktoken
 */
export function countTokensLocal(text: string): number {
  const encoder = get_encoding("cl100k_base");
  try {
    const tokens = encoder.encode(text);
    return tokens.length;
  } finally {
    encoder.free(); // Free WebAssembly memory
  }
}

/**
 * Calculates financial costs based on token count and validates via Zod
 */
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
    rates = PRICING["llama-3.3-8b-instant"];
  }

  const promptCostUSD = (promptTokens / 1_000_000) * rates.input;
  const completionCostUSD = (completionTokens / 1_000_000) * rates.output;
  const totalCostUSD = promptCostUSD + completionCostUSD;
  const totalCostINR = totalCostUSD * USD_TO_INR;

  const rawReport = {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUSD: parseFloat(totalCostUSD.toFixed(6)),
    costINR: parseFloat(totalCostINR.toFixed(4)),
  };

  // 🚀 Zod Validation check on internal output before returning
  return TokenUsageReportSchema.parse(rawReport);
}

/**
 * Production logging utility to print LLM consumption metrics
 */
export function logLLMUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
  isEstimate: boolean = false
): TokenUsageReport {
  const report = calculateCost(model, promptTokens, completionTokens);
  const typeLabel = isEstimate ? "ESTIMATE" : "ACTUAL";
  
  console.log(`\n=================== 📊 LLMOps Metrics [${typeLabel}] ===================`);
  console.log(`🤖 Model:          ${model}`);
  console.log(`📥 Input Tokens:   ${report.promptTokens}`);
  console.log(`📤 Output Tokens:  ${report.completionTokens}`);
  console.log(`🔢 Total Tokens:   ${report.totalTokens}`);
  console.log(`💲 Cost (USD):     $${report.costUSD.toFixed(6)}`);
  console.log(`🇮🇳 Cost (INR):     ₹${report.costINR.toFixed(4)}`);
  console.log(`=================================================================\n`);

  return report;
}