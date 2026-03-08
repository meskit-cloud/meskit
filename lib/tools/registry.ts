import { z } from "zod";
import { writeAuditLog, inferEntityType } from "@/lib/audit";
import { fireWebhooksForTool } from "@/lib/webhooks";
import { createClient } from "@/lib/supabase/server";

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
  caller?: { actor?: "user" | "agent"; agent_name?: string },
): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  const validated = tool.schema.parse(input);
  const result = await tool.execute(validated);

  // Fire-and-forget audit log — never blocks the tool response
  const entityId =
    validated && typeof validated === "object" && "id" in validated
      ? (validated as { id: string }).id
      : result && typeof result === "object" && "id" in result
        ? (result as { id: string }).id
        : undefined;

  writeAuditLog({
    action: name,
    actor: caller?.actor ?? "user",
    agent_name: caller?.agent_name,
    entity_type: inferEntityType(name),
    entity_id: entityId,
    metadata: validated as Record<string, unknown>,
  });

  // Fire webhooks — get userId from auth context
  createClient()
    .then((sb) => sb.auth.getUser())
    .then(({ data }) => {
      if (data.user) fireWebhooksForTool(name, data.user.id, result);
    })
    .catch(() => {});

  return result;
}
