import { tool, type Tool } from "ai";
import type { MesTool } from "@/lib/tools/registry";
import { writeAuditLog, inferEntityType } from "@/lib/audit";

type ToolSet = Record<string, Tool>;

export function toAISDKTools(mesTools: MesTool[], agentName?: string): ToolSet {
  const tools: ToolSet = {};

  for (const t of mesTools) {
    tools[t.name] = tool({
      description: t.description,
      inputSchema: t.schema,
      execute: async (input: unknown) => {
        try {
          const result = await t.execute(input);

          const entityId =
            input && typeof input === "object" && "id" in input
              ? (input as { id: string }).id
              : result && typeof result === "object" && result !== null && "id" in result
                ? (result as { id: string }).id
                : undefined;

          writeAuditLog({
            action: t.name,
            actor: "agent",
            agent_name: agentName,
            entity_type: inferEntityType(t.name),
            entity_id: entityId,
            metadata: input as Record<string, unknown>,
          });

          return result;
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      },
    });
  }

  return tools;
}
