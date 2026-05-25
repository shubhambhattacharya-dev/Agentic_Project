// src/modules/tools/tool.types.ts
//
// 📘 YE FILE KYA KARTI HAI?
// Ye file poore "Tool Registration Layer" ka blueprint hai.
// Ek "Tool" kya hota hai, uski properties kya hoti hain,
// aur execution ke baad result kaisa hoga — sab kuch yahan define hai.
//
// 🏭 INDUSTRY PATTERN: "Function Calling Specification"
// Groq, OpenAI, Anthropic — teeno same JSON structure follow karte hain
// jab AI ko tools describe karne hote hain. Ye usi standard ko follow karta hai.

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// SECTION 1: TOOL PARAMETER PROPERTY
// Ek tool ke andar ek argument (property) kaisa dikhta hai.
// Jaise cancelOrder ke liye "orderId" ek property hai.
// ─────────────────────────────────────────────────────────────a

export const ToolParameterPropertySchema = z.object({
  type: z.enum(["string", "number", "boolean"]), // Sirf safe primitive types allowed
  description: z.string().min(1),                 // AI ko samjhane ke liye description zaruri
});

export type ToolParameterProperty = z.infer<typeof ToolParameterPropertySchema>;

// ─────────────────────────────────────────────────────────────
// SECTION 2: TOOL PARAMETERS
// Ek tool ke saare arguments ka collection.
// "required" array batata hai ki AI ko kaunse args dene hi padenge.
// ─────────────────────────────────────────────────────────────

export const ToolParametersSchema = z.object({
  type: z.literal("object"),                                          // Groq spec: hamesha "object" hoga
  properties: z.record(z.string(), ToolParameterPropertySchema),     // { orderId: { type: "string", ... } }
  required: z.array(z.string()),                                      // ["orderId"] — mandatory args
});

export type ToolParameters = z.infer<typeof ToolParametersSchema>;

// ─────────────────────────────────────────────────────────────
// SECTION 3: TOOL DEFINITION
// Ek complete tool ka structure — jo Groq API ko bheja jayega.
// AI is description ko padhkar decide karta hai ki kaunsa tool use karna hai.
// ─────────────────────────────────────────────────────────────

export const ToolDefinitionSchema = z.object({
  type: z.literal("function"),   // Groq spec: hamesha "function" hoga
  function: z.object({
    name: z.string().min(1),          // Tool ka unique naam: "cancelOrder"
    description: z.string().min(10),  // AI ke liye clear description (10 chars min)
    parameters: ToolParametersSchema, // Arguments ka blueprint
  }),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ─────────────────────────────────────────────────────────────
// SECTION 4: AI TOOL CALL RESPONSE
// Jab Groq decide karta hai ki ek tool call karni hai,
// toh ye EXACT structure return karta hai.
// Hum ise validate karke hi execution ko allow karenge.
// ─────────────────────────────────────────────────────────────

export const AIToolCallSchema = z.object({
  id: z.string(),                    // Groq ka unique call ID
  type: z.literal("function"),       // Hamesha "function" hoga
  function: z.object({
    name: z.string().min(1),         // AI ne kaunsa tool choose kiya: "cancelOrder"
    arguments: z.string().min(1),    // ⚠️ YE STRING HAI — JSON.parse karna padega!
  }),
});

export type AIToolCall = z.infer<typeof AIToolCallSchema>;

// ─────────────────────────────────────────────────────────────
// SECTION 5: TOOL EXECUTION RESULT
// Jab tool execute ho jata hai (ya fail ho jaata hai),
// toh hum ek standardized result return karte hain.
// AI ko clearly pata chale ki kya hua — success ya failure.
// ─────────────────────────────────────────────────────────────

export const ToolExecutionResultSchema = z.object({
  toolName: z.string(),                         // Kaunsa tool execute hua
  success: z.boolean(),                         // Kaam hua ya nahi
  data: z.unknown().optional(),                 // Successful result (order details, etc.)
  error: z.string().optional(),                 // Failure ka reason
  securityBlocked: z.boolean().default(false),  // 🛡️ Security gate ne block kiya?
});

export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;

// ─────────────────────────────────────────────────────────────
// SECTION 6: CUSTOM ERROR CLASS
// Jab tool layer koi security violation pakde,
// toh ye specific error throw hoga — generic Error nahi.
// Isse logs mein clearly pata chalta hai ki security issue tha.
// ─────────────────────────────────────────────────────────────

export class ToolSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolSecurityError"; // Error type identify karne ke liye
  }
}
