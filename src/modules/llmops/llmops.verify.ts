// src/modules/llmops/llmops.verify.ts

import { countTokensLocal, calculateCost, logLLMUsage } from "./llmops.service.js";

async function runLLMOpsVerification() {
  console.log("⏳ Starting LLMOps Token Tracker Verification...");

  const testPrompt = "Suggest a sugar-free wild berry energy drink.";
  const testCompletion = "Here is our signature wild berry recipe: 0 calories, 100% natural caffeine.";

  try {
    // 1. Check local token counting
    const promptTokens = countTokensLocal(testPrompt);
    const completionTokens = countTokensLocal(testCompletion);
    
    console.log(`✅ Token counting works! Prompt: ${promptTokens} tokens, Completion: ${completionTokens} tokens.`);

    // 2. Check cost calculations (llama-3.3-70b-versatile rates)
    const model = "llama-3.3-70b-versatile";
    const report = calculateCost(model, promptTokens, completionTokens);
    
    if (report.totalTokens !== promptTokens + completionTokens) {
      throw new Error("Token calculation mismatch!");
    }

    // 3. Test logging function
    logLLMUsage(model, promptTokens, completionTokens, true);

    console.log("✅ LLMOps Token & Cost Tracker Verification Passed!");
  } catch (error) {
    console.error("❌ LLMOps Verification Failed!");
    console.error(error);
    process.exit(1);
  }
}

runLLMOpsVerification();
