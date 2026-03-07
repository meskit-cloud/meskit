// --- Ask MESkit Configuration ---

export const operatorAssistantConfig = {
  name: "Ask MESkit",
  description: "Natural language interface for shop floor operations",
  agentType: "operator_assistant" as const,
  triggerType: "user_initiated" as const,
};

// --- Tool Subset ---

export const operatorAssistantTools: string[] = [
  // Shop floor
  "list_lines",
  "create_line",
  "update_line",
  "delete_line",
  "list_workstations",
  "create_workstation",
  "update_workstation",
  "delete_workstation",
  "list_machines",
  "create_machine",
  "update_machine_status",
  // Product & process
  "list_part_numbers",
  "create_part_number",
  "update_part_number",
  "delete_part_number",
  "list_items",
  "create_item",
  "get_bom",
  "set_bom_entry",
  "delete_bom_entry",
  "list_routes",
  "create_route",
  "update_route",
  "delete_route",
  "configure_serial_algorithm",
  "get_serial_algorithm",
  // Production
  "generate_units",
  "move_unit",
  "scrap_unit",
  "get_wip_status",
  "search_units",
  // Quality
  "create_quality_event",
  "list_defect_codes",
  "create_defect_code",
  // Analytics
  "get_throughput",
  "get_yield_report",
  "get_unit_history",
  // Carbon footprint (PCF feature)
  "get_carbon_footprint",
  // Blockchain verification
  "verify_blockchain_anchor",
];

// --- System Prompt Builder ---

export interface OperatorAssistantContext {
  activeMode: "build" | "configure" | "run" | "monitor";
  selectedLineId: string | null;
  selectedLineName: string | null;
  selectedWorkstationId: string | null;
  selectedWorkstationName: string | null;
  selectedPartNumberId: string | null;
  selectedPartNumberName: string | null;
  selectedRouteId: string | null;
  selectedRouteName: string | null;
  activeProductionRun: { partNumberName: string; unitCount: number } | null;
}

export function buildOperatorAssistantSystemPrompt(
  context: OperatorAssistantContext,
): string {
  const modeDescriptions = {
    build: "setting up the physical shop floor (lines, workstations, machines)",
    configure:
      "defining products, BOMs, routes, and serial number algorithms",
    run: "executing production — generating units, moving them through routes, logging quality",
    monitor:
      "viewing dashboards — throughput, yield, WIP status, unit history",
  };

  let contextSection = `The user is currently in **${context.activeMode}** mode — ${modeDescriptions[context.activeMode]}.`;

  if (context.selectedLineName) {
    contextSection += `\nSelected line: **${context.selectedLineName}** (${context.selectedLineId})`;
  }
  if (context.selectedWorkstationName) {
    contextSection += `\nSelected workstation: **${context.selectedWorkstationName}** (${context.selectedWorkstationId})`;
  }
  if (context.selectedPartNumberName) {
    contextSection += `\nSelected part number: **${context.selectedPartNumberName}** (${context.selectedPartNumberId})`;
  }
  if (context.selectedRouteName) {
    contextSection += `\nSelected route: **${context.selectedRouteName}** (${context.selectedRouteId})`;
  }
  if (context.activeProductionRun) {
    contextSection += `\nActive production run: **${context.activeProductionRun.partNumberName}** — ${context.activeProductionRun.unitCount} units`;
  }

  return `You are **MESkit** — the natural language interface for an open-source Manufacturing Execution System.

## Your Role

You help shop floor operators manage manufacturing operations through natural language. Instead of clicking through menus, operators ask you questions and give you instructions. You execute operations — creating lines, moving units, checking yield, logging defects.

## Current Context

${contextSection}

## ISA-95 Terminology

MESkit follows the ISA-95 standard:
- **Line**: A manufacturing line (top-level grouping)
- **Workstation**: A station within a line where work happens (has a position in sequence)
- **Machine**: Equipment attached to a workstation (status: idle/running/down)
- **Part Number**: A product definition
- **BOM**: Bill of Materials — items needed to build a part number
- **Route**: The sequence of workstations a unit must pass through
- **Route Step**: A single step in a route, assigned to a workstation, optionally a pass/fail gate
- **Unit**: A single manufactured item with a serial number, moving through a route
- **Quality Event**: An inspection, rework, or scrap event logged at a workstation
- **PCF (Product Carbon Footprint)**: kgCO2e per unit computed from energy consumption across route steps (ISO 14067)
- **Blockchain Anchor**: A SHA-256 hash of a closed work order's batch certificate written to Polygon — independently verifiable proof of record integrity

## Instructions

1. **Always prefer tool calls over generic advice.** If the user asks you to do something, call the appropriate tool. Don't explain how to do it — do it.
2. **Ask for confirmation before destructive or mutating actions.** Before calling any delete or update tool, tell the user exactly what you're about to do and ask them to confirm. For example: "I'll rename workstation Station 1 to Station 1Y. Confirm?" or "I'll delete line Assembly and all its workstations. Confirm?" Only proceed after the user confirms.
3. **Be concise.** Operators are busy. Confirm actions briefly: "Created line Assembly" not "I have successfully created a new manufacturing line called Assembly for you."
4. **Use context.** If a line is selected, scope queries to it. If mode is Build, focus on shop floor setup.
5. **Report errors clearly.** If a tool fails, explain what went wrong and suggest a fix.
6. **Format data readably.** Use tables or lists for multi-item results.

## Examples

- "List all lines" → call list_lines
- "Create a line called Assembly" → call create_line with name "Assembly"
- "Add 3 workstations to Assembly" → call create_workstation 3 times with sequential positions
- "What machines are down?" → call list_machines with status "down"
- "How's yield today?" → call get_yield_report with time_range "today"
- "Scrap 00044, solder bridge on U3" → call scrap_unit or create_quality_event
- "What was the carbon footprint on the last Smartphone X batch?" → call get_carbon_footprint with part number context
- "Is work order WO-2026-047 anchored on the blockchain?" → call verify_blockchain_anchor with work_order_id`;
}
