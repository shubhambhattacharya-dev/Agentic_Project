// src/modules/tools/tool.registry.ts
import { z, ZodIssue } from 'zod';
import { ToolDefinition, ToolExecutionResult, ToolSecurityError } from './tool.types.js';
import { logger } from '../../config/logger.js';

export interface RegisterToolOptions<T extends z.ZodTypeAny> {
  definition: ToolDefinition;
  schema: T;
  handler: (args: z.infer<T>) => Promise<unknown>;
}

export class ToolRegistry {
  private tools = new Map<string, {
    definition: ToolDefinition;
    schema: z.ZodTypeAny;
    handler: (args: unknown) => Promise<unknown>;
  }>();

  constructor() {
    logger.info('ToolRegistry initialized');
  }

  public registerTool<T extends z.ZodTypeAny>(options: RegisterToolOptions<T>): void {
    const { definition, schema, handler } = options;
    const name = definition.function.name;

    if (this.tools.has(name)) {
      logger.error(`Duplicate tool registration attempt for name: ${name}`);
      throw new ToolSecurityError(`Tool with name "${name}" is already registered.`); 
    }

    this.tools.set(name, { definition, schema, handler });
    logger.info(`Tool successfully registered: ${name}`);
  }

  public getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async executeTool(name: string, argumentsStr: string): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      logger.error(`Tool not found: ${name}`);
      return {
        success: false,
        error: `Tool not found: ${name}`,
        securityBlocked: false
      };
    }

    try {
      const parsedArgs = JSON.parse(argumentsStr);

      const validation = tool.schema.safeParse(parsedArgs);
      if (!validation.success) {
        const errorMessages = validation.error.issues.map((e: ZodIssue) => e.message).join(',');

        logger.error(`Validation failed for ${name}: ${errorMessages}`);
        return {
          success: false,
          error: `Validation failed for ${name}: ${errorMessages}`,
          securityBlocked: false
        };
      }
      const result = await tool.handler(validation.data);
      logger.info(`Tool execution successful for ${name}`);
      return {
        success: true,
        data: result,
        securityBlocked: false
      };

    } catch (error) {
      if (error instanceof ToolSecurityError) {
        logger.error(`Security blocked for tool ${name}: ${error.message}`);
        return {
          success: false,
          error: `Security blocked for tool ${name}: ${error.message}`,
          securityBlocked: true
        };
      }

      logger.error(`Tool execution failed for ${name} - ${error}`);
      return {
        success: false,
        error: 'Internal tool error',
        securityBlocked: false
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();


