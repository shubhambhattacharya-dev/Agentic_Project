// src/modules/agent/agent.types.ts
import { z } from 'zod';
import { AIToolCallSchema } from '../tools/tool.types.js';

export const SystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string().min(1, "Content is required"),
});

export const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().min(1, "Content is required"),
});

export const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable().optional(),
  tool_calls: z.array(AIToolCallSchema).optional(),
});

export const ToolMessageSchema = z.object({
  role: z.literal("tool"),
  content: z.string(),
  tool_call_id: z.string().min(1, "Tool call ID is required"),
});

export const ChatMessageSchema = z.discriminatedUnion("role", [
  SystemMessageSchema,
  UserMessageSchema,
  AssistantMessageSchema,
  ToolMessageSchema,
]);

// TypeScript Types (inferred from Zod schemas)
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type ToolMessage = z.infer<typeof ToolMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
