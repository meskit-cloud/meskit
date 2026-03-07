import { NextRequest } from "next/server";
import { runAgent, type AgentMessage } from "@/lib/agents/runtime";
import {
  operatorAssistantTools,
  buildOperatorAssistantSystemPrompt,
  type OperatorAssistantContext,
} from "@/lib/agents/operator";
import { plannerTools, buildPlannerSystemPrompt } from "@/lib/agents/planner";

interface ChatRequestBody {
  messages: AgentMessage[];
  agent: "operator_assistant" | "quality_analyst" | "planner";
  context: {
    activeMode: "build" | "configure" | "run" | "monitor";
    selectedLineId: string | null;
    selectedLineName: string | null;
    selectedWorkstationId: string | null;
    selectedWorkstationName: string | null;
    selectedPartNumberId: string | null;
    selectedPartNumberName: string | null;
    selectedRouteId: string | null;
    selectedRouteName: string | null;
    activeProductionRun: {
      partNumberName: string;
      unitCount: number;
    } | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();

    let systemPrompt: string;
    let toolNames: string[];

    switch (body.agent) {
      case "operator_assistant": {
        const ctx: OperatorAssistantContext = {
          activeMode: body.context.activeMode,
          selectedLineId: body.context.selectedLineId,
          selectedLineName: body.context.selectedLineName,
          selectedWorkstationId: body.context.selectedWorkstationId,
          selectedWorkstationName: body.context.selectedWorkstationName,
          selectedPartNumberId: body.context.selectedPartNumberId,
          selectedPartNumberName: body.context.selectedPartNumberName,
          selectedRouteId: body.context.selectedRouteId,
          selectedRouteName: body.context.selectedRouteName,
          activeProductionRun: body.context.activeProductionRun,
        };
        systemPrompt = buildOperatorAssistantSystemPrompt(ctx);
        toolNames = operatorAssistantTools;
        break;
      }
      case "planner": {
        systemPrompt = buildPlannerSystemPrompt({
          activeMode: body.context.activeMode,
          currentWipSummary: null,
          shiftEndTime: null,
        });
        toolNames = plannerTools;
        break;
      }
      case "quality_analyst": {
        // Quality analyst is event-driven — not available via chat yet
        return new Response(
          JSON.stringify({
            error:
              "Quality Analyst is event-driven and not available via chat in M1",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown agent: ${body.agent}` }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    const stream = await runAgent({
      systemPrompt,
      toolNames,
      messages: body.messages,
      agentName: body.agent,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
