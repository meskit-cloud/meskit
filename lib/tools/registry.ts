import { z } from "zod";

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
