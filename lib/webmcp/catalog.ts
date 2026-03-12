// Auto-generates the WebMCP action catalog from the MESkit tool registry.

import { getAllTools } from "@/lib/tools/registry";
import { zodToJsonSchema } from "@/lib/openapi";
import { getActionsForMode } from "./scope";
import type { WebMCPAction, WebMCPCatalog, WebMCPMode } from "./types";

const DESTRUCTIVE_ACTIONS = new Set([
  "delete_line",
  "delete_workstation",
  "delete_machine",
  "delete_part_number",
  "delete_bom_entry",
  "delete_route",
  "delete_defect_code",
  "delete_test_definition",
  "scrap_unit",
  "remove_member",
]);

const ALL_MODES: WebMCPMode[] = ["build", "configure", "run", "monitor", "settings"];

/** Resolve which mode a tool belongs to (first match wins). */
function resolveMode(toolName: string): WebMCPMode | null {
  for (const mode of ALL_MODES) {
    if (getActionsForMode(mode).includes(toolName)) {
      return mode;
    }
  }
  return null;
}

/** Build the full WebMCP catalog from all registered tools. */
export function buildCatalog(): WebMCPCatalog {
  const tools = getAllTools();
  const actions: WebMCPAction[] = [];

  for (const tool of tools) {
    const mode = resolveMode(tool.name);
    if (!mode) continue; // tool not mapped to any mode — skip

    actions.push({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema) as Record<string, unknown>,
      destructive:
        DESTRUCTIVE_ACTIONS.has(tool.name) || tool.name.startsWith("delete_"),
      mode,
    });
  }

  return { version: "1.0.0", actions };
}

/** Return only the actions scoped to a specific mode/page. */
export function getActionsForPage(mode: WebMCPMode): WebMCPAction[] {
  const allowedNames = new Set(getActionsForMode(mode));
  return buildCatalog().actions.filter((a) => allowedNames.has(a.name));
}
