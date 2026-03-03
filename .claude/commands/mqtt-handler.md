# MQTT Edge Function Generator

Generate a Supabase Edge Function that handles MQTT message ingestion for MESkit.

## Input

$ARGUMENTS — event type (e.g., "cycle_complete")

## Instructions

Parse the event type from the input. Generate an Edge Function at:

```
supabase/functions/{event_type}-handler/index.ts
```

### Edge Function Pattern

```typescript
// supabase/functions/{event_type}-handler/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CORS Headers ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- MQTT Message Schema ---

interface MqttMessage {
  timestamp: string;
  machine_id: string;
  event_type: "{event_type}";
  payload: {EventType}Payload;
}

interface {EventType}Payload {
  // Event-specific payload fields
}

// --- Validation ---

function validateMessage(body: unknown): MqttMessage {
  // Validate required fields
  // Validate payload structure
  // Throw on invalid input
}

// --- Handler ---

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = validateMessage(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Write to mqtt_messages table
    const { error: insertError } = await supabase
      .from("mqtt_messages")
      .insert({
        topic: `meskit/${message.payload.line_id ?? "unknown"}/${message.payload.workstation_id ?? "unknown"}/${message.event_type}`,
        machine_id: message.machine_id,
        event_type: message.event_type,
        payload: message.payload,
        received_at: message.timestamp,
      });

    if (insertError) throw insertError;

    // 2. Call tool layer for downstream processing
    // (Event-specific tool calls)

    // 3. Mark message as processed
    // (Optional: update mqtt_messages.processed = true)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
```

### MQTT Topic Convention (PRD Section 8.1)

```
meskit/{line_id}/{workstation_id}/{event_type}
```

Examples:
```
meskit/line-01/ws-assembly/cycle_complete
meskit/line-01/ws-test/measurement
meskit/line-01/ws-pack/fault
```

### Message Schema (PRD Section 8.2)

Every MQTT message is a JSON payload:

```json
{
  "timestamp": "2026-03-03T14:22:01.000Z",
  "machine_id": "uuid-of-machine",
  "event_type": "cycle_complete",
  "payload": {
    "unit_serial": "SMX-00042",
    "cycle_time_ms": 4500,
    "result": "pass"
  }
}
```

### Event Types

Generate handlers matching these event types:

**`cycle_complete`** — Unit finishes a workstation step
```typescript
interface CycleCompletePayload {
  unit_serial: string;
  cycle_time_ms: number;
  result: "pass" | "fail";
  line_id?: string;
  workstation_id?: string;
}
```
Tool layer calls:
- `search_units({ serial_number: payload.unit_serial })` — find the unit
- `move_unit({ unit_id })` — advance to next step (if pass)
- `create_quality_event(...)` — log the result
- If fail: `scrap_unit({ unit_id, defect_code_id })` (if at a pass/fail gate)

**`measurement`** — A sensor reading
```typescript
interface MeasurementPayload {
  sensor_type: string;       // "temperature" | "torque" | "pressure" | etc.
  value: number;
  unit: string;              // "celsius" | "nm" | "psi" | etc.
  min_threshold?: number;
  max_threshold?: number;
  line_id?: string;
  workstation_id?: string;
}
```
Tool layer calls:
- Insert into `mqtt_messages` for historical tracking
- Anomaly Monitor trigger: evaluate if value is out of range

**`fault`** — A machine error
```typescript
interface FaultPayload {
  fault_code: string;
  description: string;
  severity: "minor" | "major" | "critical";
  line_id?: string;
  workstation_id?: string;
}
```
Tool layer calls:
- `update_machine_status({ id: machine_id, status: "down" })` — mark machine as down
- `create_quality_event(...)` — log the fault
- Anomaly Monitor trigger: evaluate fault pattern

### `mqtt_messages` Table Schema

```sql
mqtt_messages
  id uuid PK DEFAULT gen_random_uuid()
  topic text NOT NULL
  machine_id uuid FK → machines (nullable)
  event_type text NOT NULL
  payload jsonb NOT NULL
  received_at timestamptz DEFAULT now()
  processed boolean DEFAULT false
```

### Ingestion Path

```
MQTT Broker
  -> Supabase Edge Function (subscriber)
    -> Validates message against schema
    -> Writes to mqtt_messages table
    -> Calls tool layer (move_unit, create_quality_event)
    -> Anomaly Monitor agent evaluates sensor data
```

### Anomaly Monitor Trigger

After writing to `mqtt_messages`, the Edge Function should trigger the Anomaly Monitor agent for evaluation. This happens via the Realtime subscription on `mqtt_messages` — the agent listens for INSERT events.

For `fault` events, the trigger is immediate. For `measurement` events, the agent evaluates trends over a window of recent readings.

### Conventions

- Edge Functions use Deno runtime — import from `https://deno.land/std` and `https://esm.sh/`
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side operations (bypasses RLS)
- Always include CORS headers for cross-origin requests
- Validate all incoming message fields before processing
- Log errors but don't expose internal details in responses
- Each event type gets its own Edge Function for isolation
