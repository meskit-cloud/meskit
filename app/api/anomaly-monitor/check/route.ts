import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { getModel } from "@/lib/ai/provider";
import { toAISDKTools } from "@/lib/ai/tools";
import { getToolsByNames } from "@/lib/tools/registry";
import {
  buildAnomalyMonitorSystemPrompt,
  anomalyMonitorTools,
  knownMeasurementProperties,
  type AnomalyMonitorContext,
} from "@/lib/agents/anomaly";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

// Ensure tool modules register themselves
import "@/lib/tools/shop-floor";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

interface CheckRequestBody {
  machine_id: string;
  machine_name: string;
  workstation_name: string;
  event_type: "measurement" | "fault" | "cycle_complete";
  payload: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequestBody = await request.json();
    const { machine_id, machine_name, workstation_name, event_type, payload } = body;

    // Validate required fields
    if (!machine_id || !event_type) {
      return NextResponse.json(
        { error: "Missing required fields: machine_id, event_type" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // --- Pre-checks: decide whether to invoke the agent ---

    let shouldInvoke = false;
    let preCheckReason = "";

    if (event_type === "fault") {
      // Fault events always trigger the agent
      shouldInvoke = true;
      preCheckReason = "Fault event received";
    } else if (event_type === "measurement") {
      // Check if any measurement value is outside the warning range
      for (const [property, config] of Object.entries(knownMeasurementProperties)) {
        const value = payload[property];
        if (typeof value === "number") {
          const [, normalMax] = config.normalRange;
          if (value > normalMax) {
            shouldInvoke = true;
            preCheckReason = `${property} value ${value} ${config.unit} exceeds normal range (max ${normalMax})`;
            break;
          }
          const [normalMin] = config.normalRange;
          if (value < normalMin) {
            shouldInvoke = true;
            preCheckReason = `${property} value ${value} ${config.unit} below normal range (min ${normalMin})`;
            break;
          }
        }
      }
    } else if (event_type === "cycle_complete") {
      // Check if cycle time is reported and seems elevated
      const cycleTime = payload.cycle_time ?? payload.duration;
      const expectedCycleTime = payload.expected_cycle_time ?? payload.expected_duration;
      if (
        typeof cycleTime === "number" &&
        typeof expectedCycleTime === "number" &&
        expectedCycleTime > 0
      ) {
        const ratio = cycleTime / expectedCycleTime;
        if (ratio > 1.15) {
          shouldInvoke = true;
          preCheckReason = `Cycle time ${cycleTime}ms is ${Math.round((ratio - 1) * 100)}% above expected ${expectedCycleTime}ms`;
        }
      }
    }

    // If no pre-check condition is met, skip agent invocation
    if (!shouldInvoke) {
      return NextResponse.json({ alert: null, triggered: false });
    }

    // --- Run anomaly monitor agent ---

    const context: AnomalyMonitorContext = {
      machineId: machine_id,
      machineName: machine_name ?? machine_id,
      workstationName: workstation_name ?? "Unknown",
      eventType: event_type,
      latestPayload: { ...payload, _preCheckReason: preCheckReason },
    };

    const mesTools = getToolsByNames(anomalyMonitorTools);
    const tools = toAISDKTools(mesTools, "anomaly_monitor");

    const result = await generateText({
      model: getModel(),
      temperature: 0,
      system: buildAnomalyMonitorSystemPrompt(context),
      prompt: `An MQTT ${event_type} event was received from machine "${machine_name}" at workstation "${workstation_name}". ${preCheckReason}. Analyze and report.`,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(5),
    });

    const alertText = result.text?.trim() ?? null;

    // Write to audit log so the live ticker surfaces this alert
    if (alertText) {
      writeAuditLog({
        action: "anomaly_alert",
        actor: "agent",
        agent_name: "anomaly_monitor",
        entity_type: "machine",
        entity_id: machine_id,
        metadata: {
          machine_name,
          workstation_name,
          event_type,
          pre_check_reason: preCheckReason,
          alert: alertText.slice(0, 200),
        },
      });
    }

    return NextResponse.json({ alert: alertText, triggered: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Anomaly monitor check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
