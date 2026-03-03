import { z } from "zod";
import type { FunctionDeclaration, FunctionDeclarationSchemaProperty, SchemaType } from "@google/generative-ai";

// --- Tool Definition ---

export interface MesTool<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: T;
  execute: (input: z.infer<T>) => Promise<unknown>;
}

// --- Registry ---

const registry = new Map<string, MesTool>();

export function registerTool<T extends z.ZodType>(tool: MesTool<T>) {
  registry.set(tool.name, tool as unknown as MesTool);
  return tool;
}

export function getTool(name: string): MesTool | undefined {
  return registry.get(name);
}

export function getAllTools(): MesTool[] {
  return Array.from(registry.values());
}

export function getToolsByNames(names: string[]): MesTool[] {
  return names
    .map((name) => registry.get(name))
    .filter((tool): tool is MesTool => tool !== undefined);
}

// --- Gemini API Conversion ---

export function toGeminiTools(tools: MesTool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToGeminiSchema(tool.schema),
  }));
}

export function toGeminiToolsFromNames(names: string[]): FunctionDeclaration[] {
  return toGeminiTools(getToolsByNames(names));
}

// --- Zod → Gemini Schema ---

function zodToGeminiSchema(
  schema: z.ZodType,
): FunctionDeclaration["parameters"] {
  const result = zodObjectToGemini(schema);
  return {
    type: "OBJECT" as SchemaType,
    properties: result.properties,
    required: result.required,
  };
}

function zodObjectToGemini(schema: z.ZodType): {
  properties: Record<string, FunctionDeclarationSchemaProperty>;
  required: string[];
} {
  if (schema instanceof z.ZodEffects) {
    return zodObjectToGemini(schema._def.schema);
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, FunctionDeclarationSchemaProperty> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType;
      properties[key] = zodFieldToGemini(fieldSchema) as FunctionDeclarationSchemaProperty;

      if (!(fieldSchema instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return { properties, required };
  }

  return { properties: {}, required: [] };
}

function zodFieldToGemini(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodOptional) {
    return { ...zodFieldToGemini(schema._def.innerType), nullable: true };
  }

  if (schema instanceof z.ZodString) {
    return { type: "STRING" };
  }

  if (schema instanceof z.ZodNumber) {
    const checks = schema._def.checks || [];
    const isInt = checks.some((c: { kind: string }) => c.kind === "int");
    return isInt ? { type: "INTEGER" } : { type: "NUMBER" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "BOOLEAN" };
  }

  if (schema instanceof z.ZodEnum) {
    return { type: "STRING", enum: schema._def.values };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "ARRAY",
      items: zodFieldToGemini(schema._def.type),
    };
  }

  return { type: "STRING" };
}

// --- Execute Tool ---

export async function executeTool(
  name: string,
  input: unknown,
): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  const validated = tool.schema.parse(input);
  return tool.execute(validated);
}
