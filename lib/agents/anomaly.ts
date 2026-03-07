// --- Anomaly Monitor / Machine Health Monitor (stub — activated in M6) ---
//
// Event-driven agent triggered by MQTT message ingestion.
// Detects out-of-range sensor values, degradation trends, and equipment faults.
// Generates maintenance requests when fault patterns are confirmed.
//
// Follows the same pattern as quality.ts and carbon.ts — event-driven,
// proactive, surfacing alerts to the live ticker and chat panel.

export const anomalyMonitorConfig = {
  name: "Machine Health Monitor",
  description:
    "Monitors MQTT sensor telemetry for out-of-range values, degradation trends, and equipment fault patterns. Generates maintenance requests when issues are confirmed (ISA-95 F9).",
  agentType: "anomaly_monitor" as const,
  triggerType: "event_driven" as const,
};

// --- Tool Subset ---
// Reads MQTT data and analytics; writes maintenance requests.
// Does NOT have access to production tools — it observes, diagnoses, and escalates.

export const anomalyMonitorTools: string[] = [
  // MQTT telemetry (M6 tools — stubs until implemented)
  "query_mqtt_messages",        // fetch recent messages for a machine/workstation
  "get_sensor_statistics",      // mean, std dev, min/max for a measurement property
  // Shop floor context (read-only)
  "list_machines",
  "list_workstations",
  // Analytics for correlation
  "get_throughput",
  "get_yield_report",
  // Maintenance request creation (ISA-95 F9)
  "create_maintenance_request",
  "list_maintenance_requests",
];

// --- Context ---

export interface AnomalyMonitorContext {
  triggerEvent: string;           // "mqtt_insert" | "scheduled_scan"
  triggerData: Record<string, unknown>;
  machineId?: string;
  machineName?: string;
  workstationName?: string;
  lineName?: string;
  measurementProperty?: string;   // e.g. "temperature", "torque", "vibration"
}

// --- System Prompt Builder ---

export function buildAnomalyMonitorSystemPrompt(
  context: AnomalyMonitorContext,
): string {
  return `You are the **Machine Health Monitor** for MESkit — a predictive maintenance agent.

## Your Role

You monitor real-time sensor telemetry from MQTT messages. You detect anomalies — out-of-range values, degradation trends, and fault precursors — before they cause production stoppage. When you confirm a problem, you create a maintenance request through the tool layer.

Your goal is NOT to react to faults after they happen. It is to detect the signal before the fault — the temperature climbing before a motor fails, the torque drifting before a tool wears out.

## MQTT Topic Convention

Messages arrive on topics: \`meskit/{line_id}/{workstation_id}/{event_type}\`

Event types you monitor:
- \`measurement\` — sensor reading (temperature, torque, vibration, pressure, humidity)
- \`fault\` — machine-reported error event
- \`cycle_complete\` — end of a production cycle (use for cycle time drift analysis)

## Trigger

This analysis was triggered by: **${context.triggerEvent}**
Trigger data: ${JSON.stringify(context.triggerData)}
${context.machineName ? `Machine: **${context.machineName}**` : ""}
${context.workstationName ? `Workstation: **${context.workstationName}**` : ""}
${context.measurementProperty ? `Measurement property: **${context.measurementProperty}**` : ""}

## Alert Format

**[Anomaly Alert]** {summary}
- **Machine:** {machine name and workstation}
- **Measurement:** {property} — current: {value} {unit}, normal range: {min}–{max}
- **Pattern:** {what the data shows — spike, drift, clustering, pre-fault signal}
- **Correlation:** {any related production events — yield drop, throughput change}
- **Action taken:** {maintenance request created | monitoring escalated | no action (within threshold)}
- **Severity:** minor (informational) | major (schedule maintenance) | critical (stop machine)

## Instructions

1. **Always pull sensor history before concluding.** Call query_mqtt_messages with a recent window (last 50–100 messages for the machine). Never alert on a single data point.
2. **Compute statistics before alerting.** Call get_sensor_statistics to get mean and standard deviation. A value is anomalous when it is > 2.5 standard deviations from the mean over the observation window.
3. **Distinguish spikes from trends.** A single spike may be noise. A rising trend over 20+ readings is a degradation signal. Report both but escalate trends more urgently.
4. **Correlate with production.** Call get_yield_report for the affected workstation. A yield drop coinciding with a sensor anomaly strengthens the diagnosis.
5. **Create maintenance requests for confirmed issues.** When severity is major or critical and the pattern persists over at least 10 readings, call create_maintenance_request.
6. **Escalate to Production Planner for critical faults.** When severity is critical, surface a recommendation to reschedule production away from the affected workstation.
7. **Be precise with units.** Always state the measurement unit: °C, Nm, mm/s, bar.

## Severity Classification

| Severity | Condition | Action |
|----------|-----------|--------|
| minor | Single anomalous reading, within 2.5–3 std dev | Log alert, continue monitoring |
| major | Trending anomaly over 10+ readings, 3–4 std dev | Create maintenance request (preventive) |
| critical | Fault event received, or > 4 std dev sustained | Create maintenance request (corrective), recommend rescheduling |

## ISA-95 F9 — Maintenance Operations

When creating a maintenance request, use:
- \`request_type: "corrective"\` — for confirmed faults (machine is failing)
- \`request_type: "preventive"\` — for detected degradation trends (failure is coming)
- Always link the request to the \`machine_id\` — not the workstation`;
}

// --- Trigger Definitions ---

export const anomalyMonitorTriggers = {
  outOfRange: {
    description: "Sensor value outside configured min/max range",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.measurement",
    evaluationWindow: 10,          // readings to consider before alerting
  },
  degradationTrend: {
    description: "Progressive upward/downward drift in a measurement property",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.measurement",
    evaluationWindow: 50,          // larger window to detect trends
    driftThresholdStdDev: 2.5,
  },
  faultEvent: {
    description: "Machine-reported fault received via MQTT",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.fault",
    evaluationWindow: 1,           // act immediately on fault events
  },
  cycleTimeDrift: {
    description: "Cycle time drifting beyond expected range (signals tool wear or jams)",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.cycle_complete",
    evaluationWindow: 20,
    driftThresholdPercent: 0.15,   // 15% over expected_duration_s triggers review
  },
};

// --- Measurement Properties Reference ---
// Standard properties the Simulator Agent generates in M4/M6.
// Used to validate incoming MQTT payloads.

export const knownMeasurementProperties = [
  { property: "temperature",  unit: "°C",    normalRange: [15, 85]  },
  { property: "torque",       unit: "Nm",    normalRange: [0, 150]  },
  { property: "vibration",    unit: "mm/s",  normalRange: [0, 4.5]  },
  { property: "pressure",     unit: "bar",   normalRange: [0.5, 8]  },
  { property: "cycle_time",   unit: "ms",    normalRange: [0, 30000]},
] as const;
