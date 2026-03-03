import { tool, type Tool } from "ai";
import type { MesTool } from "@/lib/tools/registry";

type ToolSet = Record<string, Tool>;

export function toAISDKTools(mesTools: MesTool[]): ToolSet {
  const tools: ToolSet = {};

  for (const t of mesTools) {
    tools[t.name] = tool({
      description: t.description,
      inputSchema: t.schema,
      execute: async (input: unknown) => {
        try {
          return await t.execute(input);
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
