// src/modules/agent/agent.types.ts
import { z } from 'zod';

export const SystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string().min(1, "Content is required"),
});

export const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().min(1, "Content is required"),
});
