import {z} from 'zod'
import { AIToolCallSchema } from '../modules/tools/tool.types.js'


export const  SystemMessageSchema=z.object({
    role:z.literal("system"),
    content:z.string().min(1,"Content is required")
})


export const UserMessageSchema=z.object({
    role:z.literal("user"),
    content:z.string().min(1,"Content is required")
})

export const AssistantMessageSchema=z.object({
    role:z.literal("assistant"),
    content:z.string().nullable().optional(),
    tool_calls:z.array(AIToolCallSchema).optional()
})

export const ToolMessageSchema=z.object({
    role:z.literal("tool"),
    content:z.json(),
    tool_call_id:z.string().min(1,"Tool call id is required")

})