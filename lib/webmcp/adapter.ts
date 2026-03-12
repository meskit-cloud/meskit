// Main WebMCP adapter — wraps tool execution with scope checks.

import { executeTool, getTool } from "@/lib/tools/registry";
import { isActionAllowed } from "./scope";
import type { WebMCPMode, WebMCPExecuteResult } from "./types";

export async function executeWebMCPAction(
  actionName: string,
  params: unknown,
  mode: WebMCPMode,
): Promise<WebMCPExecuteResult> {
  // 1. Check scope — action must be allowed in the current mode
  if (!isActionAllowed(actionName, mode)) {
    return {
      success: false,
      error: `Action "${actionName}" is not available in ${mode} mode`,
    };
  }

  // 2. Verify the tool exists in the registry
  const tool = getTool(actionName);
  if (!tool) {
    return { success: false, error: `Unknown action: ${actionName}` };
  }

  // 3. Execute through the tool layer (audit + webhooks handled automatically)
  try {
    const result = await executeTool(actionName, params, {
      actor: "user",
      agent_name: "webmcp",
    });
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
