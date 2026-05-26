// src/modules/tools/tool.types.ts
import { z } from 'zod';

export const ToolParameterPropertySchema = z.object({
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().min(1, "Description is required"),
});

export const ToolParametersSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), ToolParameterPropertySchema),
  required: z.array(z.string()),
});

export const ToolDefinitionSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    parameters: ToolParametersSchema,
  }),
});

export const AIToolCallSchema = z.object({
  id: z.string().min(1, "ID is required"),
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1, "Name is required"),
    arguments: z.string().min(1, "Arguments is required"),
  }),
});

export const ToolExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  securityBlocked: z.boolean(),
});

export class ToolSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolSecurityError";
  }
}

export type ToolParameterProperty = z.infer<typeof ToolParameterPropertySchema>;
export type ToolParameters = z.infer<typeof ToolParametersSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type AIToolCall = z.infer<typeof AIToolCallSchema>;
export type ToolExecutionResult = z.infer<typeof ToolExecutionResultSchema>;
