# Mode Page Scaffolder

Scaffold a mode page for MESkit's dashboard UI.

## Input

$ARGUMENTS — mode name (e.g., "build")

## Instructions

Parse the mode name from the input. Generate the following files:

1. `app/(dashboard)/{mode}/page.tsx` — server component wrapper
2. `app/(dashboard)/{mode}/{mode}-content.tsx` — client component with interactivity
3. `app/(dashboard)/{mode}/components/` — directory for mode-specific sub-components

### Page Structure

**Server Component** — `page.tsx`

```tsx
// app/(dashboard)/{mode}/page.tsx
import { {Mode}Content } from "./{mode}-content";

export default function {Mode}Page() {
  return <{Mode}Content />;
}
```

**Client Component** — `{mode}-content.tsx`

```tsx
// app/(dashboard)/{mode}/{mode}-content.tsx
"use client";

import { useEffect, useState } from "react";
import { useModeStore } from "@/lib/stores/mode-store";
// Import tool layer functions
// Import Realtime hooks
// Import mode-specific components

export function {Mode}Content() {
  const { activeMode } = useModeStore();

  useEffect(() => {
    useModeStore.getState().setActiveMode("{mode}");
  }, []);

  return (
    <div className="{mode}-page">
      <header className="page-header">
        <h1>{Mode Title}</h1>
        <p className="page-description">{Mode description}</p>
      </header>

      <div className="{mode}-layout">
        {/* Mode-specific content */}
      </div>
    </div>
  );
}
```

### Mode-Specific Content

Generate content matching the PRD for each mode:

**Build Mode** — Shop Floor Setup (M2)
- Three-panel layout: lines list, workstation list, machine detail
- Lines CRUD panel — create/edit/delete lines via tool layer
- Workstations panel — add/reorder/remove workstations within selected line
- Machines panel — register machines, change status, attach to workstation
- Empty state guidance when no lines exist
- Realtime subscriptions for `lines`, `workstations`, `machines`

Components to scaffold:
```
app/(dashboard)/build/components/
  ├── lines-panel.tsx
  ├── workstations-panel.tsx
  └── machines-panel.tsx
```

**Configure Mode** — Product & Process (M3)
- Part numbers list with create/edit
- BOM assembly UI — add items with quantities
- Serial algorithm config — prefix, padding per part number
- Route designer — create routes for a part number
- Route step editor — add/reorder steps, assign workstations, toggle pass/fail gates

Components to scaffold:
```
app/(dashboard)/configure/components/
  ├── part-numbers-panel.tsx
  ├── bom-editor.tsx
  ├── serial-config.tsx
  └── route-designer.tsx
```

**Run Mode** — Production Execution (M4)
- Unit generation form — part number, route, count
- WIP movement controls — manual move per unit, auto-run toggle
- Simulation controls — start/pause/speed config
- Quality gate results — live pass/fail indicators
- Live ticker — scrolling event log from Realtime
- Realtime subscriptions for `units`, `unit_history`, `quality_events`

Components to scaffold:
```
app/(dashboard)/run/components/
  ├── unit-generator.tsx
  ├── wip-controls.tsx
  ├── simulation-controls.tsx
  └── live-ticker.tsx
```

**Monitor Mode** — Dashboard (M5)
- WIP tracker — real-time count of units per workstation
- Throughput chart — units completed over time (Recharts line chart)
- Yield summary — pass/fail ratio per workstation (Recharts bar chart)
- Unit lookup — search by serial number, full route history
- Quality insights panel — natural-language summaries from Quality Analyst
- All charts auto-refresh via Realtime subscriptions

Components to scaffold:
```
app/(dashboard)/monitor/components/
  ├── wip-tracker.tsx
  ├── throughput-chart.tsx
  ├── yield-summary.tsx
  ├── unit-lookup.tsx
  └── quality-insights.tsx
```

### UI Structure Reference

The app shell layout from the PRD:

```
+------------------------------------------------------------------+
|  MESkit  [> Start] [|| Pause] [>> Auto]              user@email v |
+--------+-----------------------------------------+-----------------+
|        |                                         |                 |
|  Mode  |         Main Content Area               |   Chat Panel    |
|  ----- |                                         |   -----------   |
|  Build |  (changes based on selected mode)       |   Operator      |
|  Config|                                         |   Assistant     |
|  Run   |                                         |                 |
|  Monitor|                                        |   [message...]  |
|        |                                         |   [> type here] |
+--------+-----------------------------------------+-----------------+
|  Live Ticker  [unit SMX-00042 moved to Station 3]                  |
+------------------------------------------------------------------+
```

The mode page fills the "Main Content Area" section.

### Design Tokens Reference

Use these CSS custom properties (from `app/globals.css`):

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-app` | `#F3F7FC` | App canvas background |
| `--bg-surface` | `#FFFFFF` | Cards, panels, modals |
| `--border` | `#D6E0EA` | Dividers, card edges |
| `--accent` | `#0F6FF2` | Primary actions, links |
| `--accent-hover` | `#0A58C7` | Hover states |
| `--text-primary` | `#0F172A` | Headings, body text |
| `--text-secondary` | `#334155` | Labels, secondary copy |
| `--success` | `#15803D` | Pass results, healthy status |
| `--warning` | `#B45309` | Attention states |
| `--error` | `#B91C1C` | Fail results, faults |
| `--agent` | `#7C3AED` | Agent-originated accents |

### Conventions

- Server component (`page.tsx`) is minimal — just imports and renders the client component
- Client component (`{mode}-content.tsx`) has `"use client"` directive
- Sub-components in `components/` directory are also client components
- Use Zustand stores for UI state, tool layer for data operations
- Import paths use `@/` prefix (e.g., `@/lib/tools/production`)
- Each panel/card uses white surface with subtle border: `background: var(--bg-surface); border: 1px solid var(--border);`
