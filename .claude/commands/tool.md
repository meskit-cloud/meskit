# Tool Layer Generator

Generate a tool layer function for MESkit's AI-native architecture.

## Input

$ARGUMENTS — tool name + description (e.g., "move_unit -- advance a unit to its next route step")

## Instructions

Parse the tool name and description from the input (split on `--` if present). Generate or append to the appropriate tool file based on the tool's category.

### File Placement

Determine the category from the tool name and place in the corresponding file:

| Category | File | Tool name patterns |
|----------|------|--------------------|
| Shop Floor | `lib/tools/shop-floor.ts` | `*_line`, `*_workstation`, `*_machine`, `list_lines`, `list_workstations`, `list_machines` |
| Product & Process | `lib/tools/product.ts` | `*_part_number`, `*_bom*`, `*_route*`, `*_item*`, `*_serial*` |
| Production | `lib/tools/production.ts` | `*_unit*`, `*_wip*`, `generate_units`, `move_unit`, `scrap_unit` |
| Quality | `lib/tools/quality.ts` | `*_quality*`, `*_defect*` |
| Analytics | `lib/tools/analytics.ts` | `get_throughput`, `get_yield*`, `get_unit_history` |

If the file exists, append the new tool. If not, create it with the standard imports.

### Tool Implementation Pattern

Every tool follows this exact structure:

```typescript
// lib/tools/{category}.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// --- {tool_name} ---

export const {toolName}Schema = z.object({
  // Zod schema with typed params
});

export type {ToolName}Input = z.infer<typeof {toolName}Schema>;

export async function {toolName}(input: {ToolName}Input) {
  const validated = {toolName}Schema.parse(input);
  const supabase = await createClient();

  // Supabase query
  const { data, error } = await supabase
    .from("{table_name}")
    .select("*")
    // ... query specifics

  if (error) throw new Error(`{tool_name} failed: ${error.message}`);

  return data;
}

// Claude tool definition for agent registration
export const {toolName}Definition = {
  name: "{tool_name}",
  description: "{description}",
  input_schema: {
    type: "object" as const,
    properties: {
      // Mirror Zod schema as JSON Schema
    },
    required: [/* required fields */],
  },
};
```

### Tool Catalog Reference

Use these definitions when generating tools that match known catalog entries:

**Shop Floor Tools:**
| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `list_lines` | `{}` | `Line[]` | List all manufacturing lines |
| `create_line` | `{ name, description? }` | `Line` | Create a new line |
| `update_line` | `{ id, name?, description? }` | `Line` | Update a line |
| `delete_line` | `{ id }` | `void` | Delete a line and its workstations |
| `list_workstations` | `{ line_id? }` | `Workstation[]` | List workstations, optionally filtered by line |
| `create_workstation` | `{ line_id, name, position, operator_name? }` | `Workstation` | Add a workstation to a line |
| `list_machines` | `{ workstation_id?, status? }` | `Machine[]` | List machines with optional filters |
| `update_machine_status` | `{ id, status }` | `Machine` | Change machine status (idle/running/down) |

**Product & Process Tools:**
| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `list_part_numbers` | `{}` | `PartNumber[]` | List all part numbers |
| `create_part_number` | `{ name, description? }` | `PartNumber` | Create a part number |
| `get_bom` | `{ part_number_id }` | `BomEntry[]` | Get BOM for a part number |
| `set_bom_entry` | `{ part_number_id, item_id, quantity, position }` | `BomEntry` | Add/update a BOM entry |
| `list_routes` | `{ part_number_id? }` | `Route[]` | List routes |
| `create_route` | `{ part_number_id, name, steps[] }` | `Route` | Create a route with steps |
| `configure_serial_algorithm` | `{ part_number_id, prefix, pad_length }` | `SerialAlgorithm` | Set serial number algorithm |

**Production Tools:**
| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `generate_units` | `{ part_number_id, route_id, count }` | `Unit[]` | Generate N units with auto-assigned serials |
| `move_unit` | `{ unit_id }` | `UnitHistory` | Advance a unit to its next route step |
| `scrap_unit` | `{ unit_id, defect_code_id, notes? }` | `Unit` | Mark a unit as scrapped |
| `get_wip_status` | `{ line_id?, workstation_id? }` | `WipSummary` | Current units per workstation |
| `search_units` | `{ serial_number?, status?, part_number_id? }` | `Unit[]` | Search units with filters |

**Quality Tools:**
| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `create_quality_event` | `{ unit_id, workstation_id, event_type, result, defect_code_id?, notes? }` | `QualityEvent` | Log an inspection, rework, or scrap event |
| `list_defect_codes` | `{}` | `DefectCode[]` | List all defect codes |
| `create_defect_code` | `{ code, description, severity }` | `DefectCode` | Create a new defect code |

**Analytics Tools:**
| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `get_throughput` | `{ line_id?, time_range }` | `ThroughputData` | Units completed over time |
| `get_yield_report` | `{ workstation_id?, time_range? }` | `YieldData` | Pass/fail ratio by workstation |
| `get_unit_history` | `{ unit_id }` | `UnitHistory[]` | Full route history for a unit |

### ISA-95 Table References

Map tools to their underlying tables:

| Table | ISA-95 Level | Used by |
|-------|-------------|---------|
| `lines` | Physical (L0-2) | Shop floor tools |
| `workstations` | Physical (L0-2) | Shop floor tools |
| `machines` | Physical (L0-2) | Shop floor tools |
| `part_numbers` | Product definition (L3) | Product tools |
| `items` | Product definition (L3) | Product tools |
| `bom_entries` | Product definition (L3) | Product tools |
| `routes` | Process definition (L3) | Product tools |
| `route_steps` | Process definition (L3) | Product tools |
| `units` | Production execution (L3) | Production tools |
| `unit_history` | Production execution (L3) | Production tools |
| `quality_events` | Quality operations (L3) | Quality tools |
| `defect_codes` | Quality operations (L3) | Quality tools |

### Naming Conventions

- File exports: `camelCase` (e.g., `moveUnit`, `moveUnitSchema`, `moveUnitDefinition`)
- Tool names in definitions: `snake_case` (e.g., `"move_unit"`)
- Types: `PascalCase` (e.g., `MoveUnitInput`)
- Zod field names: `snake_case` matching database columns

### Zod Patterns

```typescript
// UUID field
z.string().uuid()

// Optional text
z.string().optional()

// Enum
z.enum(["idle", "running", "down"])

// Positive integer
z.number().int().min(1)

// Count with limit
z.number().int().min(1).max(1000)

// Time range
z.enum(["today", "last_8_hours", "last_24_hours", "last_7_days", "last_30_days"])
```

If the tool name matches one from the catalog, use the exact parameters and description. If it's a new tool, follow the same conventions and explain which ISA-95 tables it interacts with.
