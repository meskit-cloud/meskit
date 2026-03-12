// Maps tools to MESkit modes — defines which actions are available on each page.

import type { WebMCPMode } from "./types";

const SCOPE_MAP: Record<WebMCPMode, string[]> = {
  build: [
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
    "update_machine",
    "delete_machine",
    "update_machine_status",
  ],
  configure: [
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
    "create_test_definition",
    "list_test_definitions",
  ],
  run: [
    "generate_units",
    "move_unit",
    "scrap_unit",
    "get_wip_status",
    "search_units",
    "create_production_order",
    "update_order_status",
    "list_production_orders",
    "create_quality_event",
    "list_defect_codes",
    "create_defect_code",
    "record_test_result",
  ],
  monitor: [
    "get_throughput",
    "get_yield_report",
    "get_unit_history",
    "get_oee",
    "get_order_summary",
    "get_capability_snapshot",
    "search_units",
    "query_mqtt_messages",
    "get_sensor_statistics",
    "list_maintenance_requests",
  ],
  settings: [
    "get_organization",
    "update_organization",
    "list_members",
    "invite_member",
    "update_member_role",
    "remove_member",
    "list_plants",
    "create_plant",
    "update_plant",
  ],
};

/** Check whether a specific action is allowed in the given mode. */
export function isActionAllowed(actionName: string, mode: WebMCPMode): boolean {
  return (SCOPE_MAP[mode] ?? []).includes(actionName);
}

/** Return the list of tool names scoped to a given mode. */
export function getActionsForMode(mode: WebMCPMode): string[] {
  return SCOPE_MAP[mode] ?? [];
}
