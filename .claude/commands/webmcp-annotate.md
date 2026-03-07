# WebMCP Annotator

Annotate a MESkit page or form with WebMCP APIs so browser-based AI agents can interact with it natively.

## Input

$ARGUMENTS — page or form name + API type (e.g., "configure/part-numbers -- declarative" or "build/create-line -- imperative")

## Instructions

Parse the page/form name and API type from the input (split on `--` if present). Apply the correct WebMCP pattern based on the type:

- **declarative** → annotate existing JSX form fields with WebMCP attributes
- **imperative** → generate or append to `lib/webmcp/adapter.ts` to expose tool registry functions as structured JavaScript actions

If no type is specified, infer it: Configure Mode forms = declarative, Build/Run/Monitor workflows = imperative.

See `docs/webmcp-integration.md` for full architecture context.

---

### Pattern 1: Declarative API — Form Annotations

Apply to: Configure Mode forms (part numbers, BOMs, routes, serial algorithms), Monitor Mode filters.

Add `data-webmcp-*` attributes to existing form elements so agents can discover and fill them without DOM scraping.

```tsx
// Before (existing form field)
<input
  id="part-number-name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="e.g. Smartphone X"
/>

// After (WebMCP annotated)
<input
  id="part-number-name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="e.g. Smartphone X"
  data-webmcp-field="name"
  data-webmcp-description="Human-readable name for this part number. Used to identify the product across MESkit."
  data-webmcp-required="true"
  data-webmcp-type="text"
/>
```

**Form-level annotation** (add to the `<form>` element):

```tsx
<form
  onSubmit={handleSubmit}
  data-webmcp-action="create_part_number"
  data-webmcp-description="Create a new material definition (part number) with a name and optional description."
  data-webmcp-confirmation="false"    // true for destructive actions
>
```

**Select and enum fields:**

```tsx
<select
  data-webmcp-field="production_type"
  data-webmcp-description="ISA-95 production type for this material."
  data-webmcp-options='["discrete","batch","continuous"]'
  data-webmcp-default="discrete"
>
```

**Numeric fields:**

```tsx
<input
  type="number"
  data-webmcp-field="quantity"
  data-webmcp-description="Number of material lots to generate."
  data-webmcp-min="1"
  data-webmcp-max="1000"
  data-webmcp-type="integer"
/>
```

**Destructive actions require confirmation:**

```tsx
<button
  type="submit"
  data-webmcp-action="delete_part_number"
  data-webmcp-description="Permanently delete this part number and all associated routes and BOM entries."
  data-webmcp-confirmation="true"
  data-webmcp-confirmation-message="This will delete {name} and all its routes. This cannot be undone."
>
  Delete
</button>
```

---

### Pattern 2: Imperative API — Tool Registry Adapter

Apply to: Build Mode workflows, Run Mode operations, Monitor Mode exports. Multi-step or dynamic interactions where forms alone are insufficient.

Generate or append to `lib/webmcp/adapter.ts`:

```typescript
// lib/webmcp/adapter.ts
"use client";

import { getToolsByNames } from "@/lib/tools/registry";
import type { RegisteredTool } from "@/lib/tools/registry";

// WebMCP imperative action catalog — auto-generated from tool registry
// Exposes selected tools as structured JavaScript actions for browser agents.

declare global {
  interface Window {
    __webmcp?: {
      actions: WebMCPAction[];
      execute: (actionName: string, params: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

interface WebMCPAction {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  requiresConfirmation: boolean;
}

// Tools exposed via imperative API.
// Add new tool names here as WebMCP coverage expands through M7.
const EXPOSED_TOOLS: string[] = [
  // Build Mode
  "create_line",
  "update_line",
  "delete_line",
  "create_workstation",
  "update_workstation",
  "create_machine",
  "update_machine_status",
  // Configure Mode
  "create_part_number",
  "update_part_number",
  "set_bom_entry",
  "create_route",
  "configure_serial_algorithm",
  // Run Mode
  "generate_units",
  "move_unit",
  "scrap_unit",
  "create_quality_event",
  // Monitor Mode
  "get_throughput",
  "get_yield_report",
  "get_unit_history",
  "search_units",
  // Sustainability + compliance
  "get_carbon_footprint",
  "export_pathfinder_json",
  "verify_blockchain_anchor",
];

// Destructive actions that require user confirmation before execution.
const CONFIRMATION_REQUIRED = new Set([
  "delete_line",
  "delete_part_number",
  "scrap_unit",
]);

export function initWebMCPAdapter(): void {
  const tools = getToolsByNames(EXPOSED_TOOLS);

  const actions: WebMCPAction[] = tools.map((tool: RegisteredTool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema, // already JSON Schema from registry
    requiresConfirmation: CONFIRMATION_REQUIRED.has(tool.name),
  }));

  window.__webmcp = {
    actions,
    execute: async (actionName: string, params: Record<string, unknown>) => {
      const tool = tools.find((t: RegisteredTool) => t.name === actionName);
      if (!tool) throw new Error(`WebMCP: unknown action "${actionName}"`);

      // Confirmation gate for destructive actions
      if (CONFIRMATION_REQUIRED.has(actionName)) {
        const confirmed = window.confirm(
          `Agent wants to execute "${actionName}". This action may be destructive. Allow?`
        );
        if (!confirmed) throw new Error(`WebMCP: user denied "${actionName}"`);
      }

      return tool.execute(params);
    },
  };
}
```

**Initialize the adapter** in the app shell (add to `components/app-shell.tsx`):

```tsx
// components/app-shell.tsx (add to useEffect)
"use client";
import { initWebMCPAdapter } from "@/lib/webmcp/adapter";

useEffect(() => {
  if (typeof window !== "undefined") {
    initWebMCPAdapter();
  }
}, []);
```

---

### Form Field Attribute Reference

| Attribute | Type | Description |
|-----------|------|-------------|
| `data-webmcp-action` | string | Tool name this form submits (matches tool registry name) |
| `data-webmcp-field` | string | Parameter name this field maps to (matches tool schema key) |
| `data-webmcp-description` | string | Agent-readable description of the field |
| `data-webmcp-required` | "true" \| "false" | Whether this field is required |
| `data-webmcp-type` | string | "text" \| "integer" \| "number" \| "boolean" \| "enum" |
| `data-webmcp-options` | JSON string | Valid values for enum fields |
| `data-webmcp-default` | string | Default value agents should use |
| `data-webmcp-min` | string | Minimum value for numeric fields |
| `data-webmcp-max` | string | Maximum value for numeric fields |
| `data-webmcp-confirmation` | "true" \| "false" | Whether this action needs user confirmation |
| `data-webmcp-confirmation-message` | string | Message shown in confirmation dialog |

---

### Page Coverage Map (M7 milestone)

| Page / Form | API Type | Status | Tool(s) |
|-------------|----------|--------|---------|
| Configure: Part Number CRUD | declarative | pending | `create_part_number`, `update_part_number` |
| Configure: BOM assembly | declarative | pending | `set_bom_entry`, `delete_bom_entry` |
| Configure: Serial algorithm | declarative | pending | `configure_serial_algorithm` |
| Configure: Route designer | declarative | pending | `create_route`, `update_route` |
| Build: Line CRUD | imperative | pending | `create_line`, `update_line`, `delete_line` |
| Build: Workstation CRUD | imperative | pending | `create_workstation`, `update_workstation` |
| Build: Machine CRUD | imperative | pending | `create_machine`, `update_machine_status` |
| Run: Unit generation | imperative | pending | `generate_units` |
| Run: WIP movement | imperative | pending | `move_unit`, `scrap_unit` |
| Monitor: Dashboard filters | declarative | pending | `get_throughput`, `get_yield_report` |
| Monitor: Unit lookup | imperative | pending | `search_units`, `get_unit_history` |
| Monitor: Carbon export | imperative | pending | `export_pathfinder_json` |

---

### Security Rules

These apply to ALL WebMCP annotations. Never violate them:

1. **Auth boundary**: WebMCP actions inherit the user's Supabase session. The `execute` function runs as a Server Action — RLS policies apply exactly as they do for UI interactions.
2. **Destructive actions always require confirmation**: `delete_*`, `scrap_unit`, and any action with irreversible effects must have `data-webmcp-confirmation="true"` and a clear confirmation message.
3. **No credential exposure**: WebMCP adapters never include API keys, private keys, or service role credentials. Client-side code only.
4. **Scope by page context**: Restrict which actions are available on each page. A browser agent on the Monitor Mode page should not be able to call `delete_line`.

### Conventions

- Attribute names: always `data-webmcp-*` kebab-case
- Action names: always match the tool registry `snake_case` name exactly — no aliases
- Descriptions: write for an AI reader, not a human — precise, functional, no marketing language
- After annotating a form, update the page coverage map in this skill file
- Run `npm run typecheck` after modifying `lib/webmcp/adapter.ts`
