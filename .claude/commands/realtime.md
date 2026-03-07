# Realtime Subscription Hook

Generate a Supabase Realtime subscription hook for MESkit.

## Input

$ARGUMENTS — table + purpose (e.g., "units table for live WIP tracking")

## Instructions

Parse the table name and purpose from the input. Generate a hook file at:

```
lib/hooks/use-realtime-{resource}.ts
```

Convert the table/resource name to kebab-case for the filename.

### Hook Implementation Pattern

```typescript
// lib/hooks/use-realtime-{resource}.ts
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Import the relevant Zustand store
// import { use{Domain}Store } from "@/lib/stores/{domain}-store";

type {Resource}Row = {
  // Type matching the Supabase table row
};

type {Resource}ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtime{Resource}Options {
  /** Filter to a specific parent entity (e.g., line_id for workstations) */
  filter?: { column: string; value: string };
  /** Events to subscribe to (default: all) */
  events?: {Resource}ChangeEvent[];
  /** Optional callback when a change triggers an agent action */
  onAgentTrigger?: (payload: RealtimePostgresChangesPayload<{Resource}Row>) => void;
  /** Enable/disable the subscription (default: true) */
  enabled?: boolean;
}

export function useRealtime{Resource}(options: UseRealtime{Resource}Options = {}) {
  const { filter, events = ["INSERT", "UPDATE", "DELETE"], onAgentTrigger, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    const channelName = `realtime-{table}${filter ? `-${filter.value}` : ""}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: events.length === 1 ? events[0] : "*",
          schema: "public",
          table: "{table_name}",
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload: RealtimePostgresChangesPayload<{Resource}Row>) => {
          // Update Zustand store with new data
          // const store = use{Domain}Store.getState();
          // Handle INSERT / UPDATE / DELETE based on payload.eventType

          // Optional: trigger agent callback
          if (onAgentTrigger) {
            onAgentTrigger(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter?.column, filter?.value, enabled]);
}
```

### Realtime-Eligible Tables

These tables should have Realtime enabled (via `ALTER PUBLICATION supabase_realtime ADD TABLE`):

| Table | Typical events | Use case |
|-------|---------------|----------|
| `lines` | INSERT, UPDATE, DELETE | Build Mode sync across tabs |
| `workstations` | INSERT, UPDATE, DELETE | Build Mode sync across tabs |
| `machines` | INSERT, UPDATE | Machine status changes (idle/running/down) |
| `units` | INSERT, UPDATE | Live WIP tracking, unit generation events |
| `unit_history` | INSERT | Live ticker — unit movements and quality gate results |
| `quality_events` | INSERT | Quality Monitor trigger — yield drop and defect clustering |
| `mqtt_messages` | INSERT | Machine Health Monitor trigger (M6) |

### Filter Patterns

Common filters for scoped subscriptions:

```typescript
// Workstations within a specific line
filter: { column: "line_id", value: lineId }

// Units with a specific status
filter: { column: "status", value: "in_progress" }

// Quality events at a workstation
filter: { column: "workstation_id", value: workstationId }

// Machines at a workstation
filter: { column: "workstation_id", value: workstationId }
```

### Zustand Store Integration

The hook should update the relevant Zustand store when changes arrive. Access stores outside React via `use{Store}.getState()`:

```typescript
// Inside the channel callback:
const store = useModeStore.getState();

if (payload.eventType === "INSERT") {
  // Add new record to store
}
if (payload.eventType === "UPDATE") {
  // Update existing record in store
}
if (payload.eventType === "DELETE") {
  // Remove record from store
}
```

### Agent Trigger Callback

Some Realtime events should trigger agent evaluation. Use the `onAgentTrigger` option:

- `quality_events` INSERT -> Quality Monitor evaluates yield thresholds
- `mqtt_messages` INSERT -> Machine Health Monitor evaluates sensor data
- `units` UPDATE (status = 'scrapped') -> Quality Monitor logs defect pattern

### Conventions

- Always include cleanup in the `useEffect` return (remove channel)
- Use descriptive channel names to avoid collisions
- Keep the hook focused on one table — compose multiple hooks if needed
- The `enabled` option allows conditional subscriptions
- Import `createClient` from `@/lib/supabase/client` (browser client), NOT `/server`
