// src/modules/ai/verify-ai.ts

import { generateStructuredOutput } from "./ai.service.js";
import { z } from "zod";

// 1. Ek test schema banate hain (Recipe details format)
const RecipeSchema = z.object({
  recipeName: z.string(),
  cookingTimeMinutes: z.number().int().positive(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

// Type extraction
type Recipe = z.infer<typeof RecipeSchema>;

async function runVerification() {
  console.log("⏳ Starting AI Integration Verification Test...");
  
  const systemPrompt = "You are a professional chef. Provide a simple, fast recipe based on the user's request.";
  const userPrompt = "Suggest a recipe for a quick sugar-free lemon energy booster drink.";

  try {
    // generic function calls with Recipe type constraint
    const result = await generateStructuredOutput<Recipe>({
      schema: RecipeSchema,
      systemPrompt,
      userPrompt,
    });

    console.log("✅ AI Integration Test Passed successfully!");
    console.log("\n--- Output Received ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("------------------------");
  } catch (error) {
    console.error("❌ AI Integration Test Failed!");
    console.error(error);
    process.exit(1);
  }
}

runVerification();