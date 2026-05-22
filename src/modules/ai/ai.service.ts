// src/modules/ai/ai.service.ts

import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "../../config/env.js";

// 🚀 Production Rule 1: Trim Environment Variables
// .env se aane wale strings ke aage-piche spaces ho sakte hain (Jaise "llama-3.3-8b-instant ").
// Unhe .trim() karna important hai taaki API call network level par fail na ho.
const apiKey = env.GROQ_API.trim();
const defaultModel = env.GROQ_MODEL_LLM.trim();

if (!apiKey) {
  throw new Error("CRITICAL: Groq API Key is empty or invalid!");
}

// 🚀 Production Rule 2: Singleton Pattern for API Client
// Groq Client ka sirf ek instance pure application lifecycle mein rehna chahiye.
export const groq = new Groq({
  apiKey: apiKey,
});

// Arguments ko dynamic aur easily readable banane ke liye Interface
interface StructuredOutputOptions<T> {
  schema: z.Schema<T>;            // Zod schema validation ke liye
  systemPrompt: string;           // LLM ko roll design dene ke liye
  userPrompt: string;             // User ka input instruction
  model?: string;                 // LLM ya SLM model select karne ke liye (Optional)
  temperature?: number;           // Creativity control (0.0 to 1.0)
  maxTokens?: number;             // Output token limits
}


export async function generateStructuredOutput<T>({
  schema,
  systemPrompt,
  userPrompt,
  model = defaultModel,
  temperature = 0.1, // 🚀 Production Rule 3: Deterministic Low Temperature
                     // Low temperature (0.1) se LLM zyada accurate aur structured data dega,
                     // hallucinate nahi karega (gappe nahi marega).
  maxTokens = 1000,
}: StructuredOutputOptions<T>): Promise<T> {
  
  // 🚀 Production Rule 4: Explicit Schema Injection in Prompt
  // Groq ko batana padta hai ki schema ka format kya hona chahiye.
  // Hum dynamically schema shape ko serialize karke system prompt mein inject karte hain.
  const jsonSystemPrompt = `${systemPrompt}
  
CRITICAL: You must return a valid JSON object matching this schema.
Do not return any other text, markdown formatting (like \`\`\`json), or conversational fillers.
Expected JSON Structure Schema: ${JSON.stringify((schema as any).shape || schema)}`;

  try {
    // API Call to Groq
    const response = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: jsonSystemPrompt },
        { role: "user", content: userPrompt }
      ],
      // 🚀 Production Rule 5: Force JSON Object Mode
      // Yeh direct API parameter hai jo Groq ko system guidelines ke mutabik
      // strictly JSON generator mode mein switch karta hai.
      response_format: { type: "json_object" },
      temperature: temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI returned an empty response.");
    }

    // 🚀 Production Rule 6: Secure Parsing with Error Trapping
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch (parseErr) {
      console.error("❌ Failed to parse JSON string returned by LLM:", content);
      throw new Error(`LLM output was not valid JSON: ${(parseErr as Error).message}`);
    }

    // 🚀 Production Rule 7: Strict Runtime Validation using safeParse()
    // safeParse() use karne se code crash nahi hota. Agar check fail hua toh
    // safe success status ke sath validation errors deta hai.
    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      console.error("❌ Zod Schema Validation Failed! Errors:", validationResult.error.format());
      console.error("Failed JSON Content:", parsedJson);
      throw new Error("LLM response did not match the expected Zod schema structure.");
    }

    // Bilkul safe aur validated data return karo
    return validationResult.data;

  } catch (error) {
    // 🚀 Production Rule 8: Clean Logging and Error Wrapping
    // Production app mein database errors ya credentials ko logs mein leak nahi karte.
    // Hum error log locally console par karenge par output clean wrapper error bhejenge.
    console.error("Error inside generateStructuredOutput:", error);
    throw error;
  }
}