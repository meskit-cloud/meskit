import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { getModel } from "@/lib/ai/provider";
import { toAISDKTools } from "@/lib/ai/tools";
import { getToolsByNames } from "@/lib/tools/registry";
import {
  buildQualityAnalystSystemPrompt,
  qualityAnalystTools,
  qualityAnalystTriggers,
} from "@/lib/agents/quality";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

// Ensure tool modules register themselves
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

interface QualityEventRow {
  id: string;
  workstation_id: string;
  defect_code_id?: string | null;
  result: "pass" | "fail" | "scrap";
  timestamp: string;
}

interface CheckRequestBody {
  triggerEvent: string;
  triggerData: QualityEventRow;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckRequestBody = await request.json();
    const { triggerEvent, triggerData } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // --- Pre-checks: avoid running the agent on every event ---

    let yieldDropDetected = false;
    let defectClusterDetected = false;

    // Pre-check 1: Yield drop — last 50 events at this workstation
    if (triggerData.workstation_id) {
      const { data: recentEvents } = await supabase
        .from("quality_events")
        .select("result")
        .eq("workstation_id", triggerData.workstation_id)
        .order("timestamp", { ascending: false })
        .limit(qualityAnalystTriggers.yieldDrop.windowSize);

      if (recentEvents && recentEvents.length >= 10) {
        const passCount = recentEvents.filter((e) => e.result === "pass").length;
        const yield_ = passCount / recentEvents.length;
        if (yield_ < qualityAnalystTriggers.yieldDrop.defaultThreshold) {
          yieldDropDetected = true;
        }
      }
    }

    // Pre-check 2: Defect clustering — same defect code 3+ times in last 30 minutes
    if (triggerData.defect_code_id) {
      const windowStart = new Date(
        Date.now() - qualityAnalystTriggers.defectClustering.windowMinutes * 60 * 1000,
      ).toISOString();

      const { data: clusterEvents } = await supabase
        .from("quality_events")
        .select("id")
        .eq("defect_code_id", triggerData.defect_code_id)
        .gte("timestamp", windowStart);

      if (
        clusterEvents &&
        clusterEvents.length >= qualityAnalystTriggers.defectClustering.defaultCount
      ) {
        defectClusterDetected = true;
      }
    }

    // If neither threshold is crossed, skip agent invocation
    if (!yieldDropDetected && !defectClusterDetected) {
      return NextResponse.json({ alert: null, triggered: false });
    }

    // --- Run quality analyst agent ---

    const context = {
      triggerEvent,
      triggerData: {
        ...triggerData,
        yieldDropDetected,
        defectClusterDetected,
      },
    };

    const mesTools = getToolsByNames(qualityAnalystTools);
    const tools = toAISDKTools(mesTools, "quality_analyst");

    const result = await generateText({
      model: getModel(),
      temperature: 0,
      system: buildQualityAnalystSystemPrompt(context),
      prompt: `A quality event was just recorded at workstation ${triggerData.workstation_id}.${
        yieldDropDetected ? " YIELD DROP detected (below 90%)." : ""
      }${
        defectClusterDetected ? " DEFECT CLUSTER detected (3+ same code in 30 min)." : ""
      } Investigate and report.`,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(5),
    });

    const alertText = result.text?.trim() ?? null;

    // Write to audit log so the live ticker surfaces this alert
    if (alertText) {
      writeAuditLog({
        action: "quality_alert",
        actor: "agent",
        agent_name: "quality_analyst",
        entity_type: "quality_event",
        entity_id: triggerData.id,
        metadata: {
          workstation_id: triggerData.workstation_id,
          yield_drop: yieldDropDetected,
          defect_cluster: defectClusterDetected,
          alert: alertText.slice(0, 200),
        },
      });
    }

    return NextResponse.json({ alert: alertText, triggered: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quality monitor check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
