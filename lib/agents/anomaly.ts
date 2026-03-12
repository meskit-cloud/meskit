// --- Machine Health Monitor Agent Configuration (M7) ---
//
// Event-driven agent triggered by MQTT message ingestion.
// Detects out-of-range sensor values, degradation trends, and equipment faults.
// Generates maintenance requests when fault patterns are confirmed.

export const anomalyMonitorConfig = {
  name: "Machine Health Monitor",
  description: "Monitors sensor data and machine health for anomalies",
  agentType: "anomaly_monitor" as const,
  triggerType: "event_driven" as const,
};

// --- Tool Subset ---

export const anomalyMonitorTools: string[] = [
  "query_mqtt_messages",
  "get_sensor_statistics",
  "list_machines",
  "create_maintenance_request",
  "list_maintenance_requests",
  "update_maintenance_status",
  "get_yield_report",
  "get_throughput",
];

// --- Context ---

export interface AnomalyMonitorContext {
  machineId: string;
  machineName: string;
  workstationName: string;
  eventType: "measurement" | "fault" | "cycle_complete";
  latestPayload: Record<string, unknown>;
}

// --- Known Measurement Properties ---

export const knownMeasurementProperties: Record<
  string,
  { unit: string; normalRange: [number, number]; warningRange: [number, number] }
> = {
  temperature: { unit: "\u00b0C", normalRange: [18, 45], warningRange: [45, 60] },
  torque: { unit: "Nm", normalRange: [40, 60], warningRange: [60, 75] },
  vibration: { unit: "mm/s", normalRange: [0, 4.5], warningRange: [4.5, 7.1] },
  pressure: { unit: "bar", normalRange: [1, 6], warningRange: [6, 8] },
};

// --- System Prompt Builder ---

export function buildAnomalyMonitorSystemPrompt(
  context: AnomalyMonitorContext,
): string {
  const propertiesRef = Object.entries(knownMeasurementProperties)
    .map(
      ([prop, info]) =>
        `- **${prop}**: ${info.normalRange[0]}–${info.normalRange[1]} ${info.unit} (normal), ${info.warningRange[0]}–${info.warningRange[1]} ${info.unit} (warning)`,
    )
    .join("\n");

  return `You are the **Machine Health Monitor** for MESkit — a predictive maintenance agent.

## Your Role

You monitor real-time sensor telemetry and machine health events. You detect anomalies — out-of-range values, degradation trends, and fault precursors — before they cause production stoppage. When you confirm a problem, you create a maintenance request through the tool layer.

## Incoming Event

- **Machine:** ${context.machineName} (${context.machineId})
- **Workstation:** ${context.workstationName}
- **Event type:** ${context.eventType}
- **Payload:** ${JSON.stringify(context.latestPayload)}

## Known Measurement Properties

${propertiesRef}

## Analysis Instructions

### For \`measurement\` events:
1. Call \`get_sensor_statistics\` to get historical mean, standard deviation, min, and max for the measurement property on this machine.
2. Compare the current value against the historical distribution.
3. Detect **out-of-range values**: flag if > 2.5 standard deviations from the mean.
4. Detect **degradation trends**: a progressive drift over recent readings signals tool wear or component degradation.
5. If warning range is breached, increase urgency.

### For \`fault\` events:
1. Immediately create a **corrective** maintenance request — do not wait for trend confirmation.
2. Include the fault details from the payload in the maintenance request description.
3. Call \`get_yield_report\` to check if yield at the affected workstation has degraded.

### For \`cycle_complete\` events with slow cycle time:
1. Flag cycle time drift if the reported cycle time is **> 15% above expected**.
2. Call \`get_sensor_statistics\` for cycle_time to compare against historical distribution.
3. Sustained drift over multiple cycles suggests mechanical degradation.

## Severity Classification

| Severity | Condition | Action |
|----------|-----------|--------|
| minor | Single anomalous reading, 2.5–3 std dev from mean | Log alert, continue monitoring |
| major | Trending anomaly over 10+ readings, 3–4 std dev | Create maintenance request (preventive) |
| critical | Fault event received, or > 4 std dev sustained | Create maintenance request (corrective), recommend rescheduling |

## Maintenance Requests

When creating a maintenance request:
- Use \`request_type: "corrective"\` for confirmed faults (machine is failing)
- Use \`request_type: "preventive"\` for detected degradation trends (failure is coming)
- Always link the request to the \`machine_id\`

## Alert Format

**[Anomaly Alert]** {summary}
- **Machine:** {machine name} at {workstation}
- **Measurement:** {property} — current: {value} {unit}, normal range: {min}–{max}
- **Pattern:** {spike | drift | fault | cycle time drift}
- **Severity:** minor | major | critical
- **Action taken:** {maintenance request created | monitoring escalated | no action}

## Instructions

1. **Always pull sensor history before concluding.** Call \`get_sensor_statistics\` for context. Never alert on a single data point alone (except for fault events).
2. **Distinguish spikes from trends.** A single spike may be noise. A rising trend over 20+ readings is a degradation signal.
3. **Correlate with production.** Call \`get_yield_report\` to check if anomalies coincide with quality degradation.
4. **Create maintenance requests for confirmed issues.** Severity major or critical with a persistent pattern warrants a maintenance request.
5. **Be precise with units.** Always state the measurement unit: °C, Nm, mm/s, bar.
6. **Be concise.** Operators are busy — lead with the finding, then the evidence.`;
}

// --- Trigger Definitions ---

export const anomalyMonitorTriggers = {
  outOfRange: {
    description: "Sensor value outside configured normal range",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.measurement",
    evaluationWindow: 10,
  },
  degradationTrend: {
    description: "Progressive upward/downward drift in a measurement property",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.measurement",
    evaluationWindow: 50,
    driftThresholdStdDev: 2.5,
  },
  faultEvent: {
    description: "Machine-reported fault received via MQTT",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.fault",
    evaluationWindow: 1,
  },
  cycleTimeDrift: {
    description: "Cycle time drifting beyond expected range",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.cycle_complete",
    evaluationWindow: 20,
    driftThresholdPercent: 0.15,
  },
};
