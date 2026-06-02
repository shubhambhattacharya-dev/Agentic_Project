// src/modules/ai/ai.service.ts

import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

// 🚀 Production Rule 1: Trim Environment Variables
const apiKey = env.GROQ_API.trim();
const defaultModel = env.GROQ_MODEL_LLM.trim();

if (!apiKey) {
  throw new Error("CRITICAL: Groq API Key is empty or invalid!");
}

// 🚀 Production Rule 2: Singleton Pattern for API Client
export const groq = new Groq({
  apiKey: apiKey,
});

interface StructuredOutputOptions<T> {
  schema: z.Schema<T>;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateStructuredOutput<T>({
  schema,
  systemPrompt,
  userPrompt,
  model = defaultModel,
  temperature = 0.1, // 🚀 Production Rule 3: Deterministic Low Temperature
  maxTokens = 1000,
}: StructuredOutputOptions<T>): Promise<T> {
  
  // 🚀 Production Rule 4: Type-Safe Schema Description Injection in Prompt (No 'as any' cast)
  let schemaDescription = "";
  if (schema instanceof z.ZodObject) {
    schemaDescription = JSON.stringify(schema.shape);
  } else {
    schemaDescription = JSON.stringify(schema);
  }

  const jsonSystemPrompt = `${systemPrompt}
  
CRITICAL: You must return a valid JSON object matching this schema.
Do not return any other text, markdown formatting (like \`\`\`json), or conversational fillers.
Expected JSON Structure Schema: ${schemaDescription}`;

  try {
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    // 🚀 Production Rule 5: Resilience & Retry Loop with Exponential Backoff
    while (attempts < maxAttempts) {
      try {
        response = await groq.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: jsonSystemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: temperature,
          max_tokens: maxTokens,
        });
        break;
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw err;
        }
        const delay = Math.pow(2, attempts) * 1000;
        logger.warn(
          err,
          `[GROQ API] Call failed (attempt ${attempts}/${maxAttempts}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!response) {
      throw new Error("AI response was undefined after retries.");
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI returned an empty response.");
    }

    // 🚀 Production Rule 6: Secure Parsing with Error Trapping
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (parseErr) {
      logger.error({ content }, "❌ Failed to parse JSON string returned by LLM");
      throw new Error(`LLM output was not valid JSON: ${(parseErr as Error).message}`, { cause: parseErr });
    }

    // 🚀 Production Rule 7: Strict Runtime Validation using safeParse()
    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      logger.error(
        { errors: validationResult.error.format(), content: parsedJson },
        "❌ Zod Schema Validation Failed"
      );
      throw new Error("LLM response did not match the expected Zod schema structure.");
    }

    return validationResult.data;

  } catch (error) {
    logger.error(error, "Error inside generateStructuredOutput");
    throw new Error("Failed to generate structured output", { cause: error });
  }
  }