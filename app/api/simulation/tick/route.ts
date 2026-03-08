import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { getModel } from "@/lib/ai/provider";
import { toAISDKTools } from "@/lib/ai/tools";
import { getToolsByNames } from "@/lib/tools/registry";
import {
  buildSimulatorSystemPrompt,
  simulatorTools,
  type SimulationScenario,
  type SimulatorContext,
} from "@/lib/agents/simulator";
import { createClient } from "@/lib/supabase/server";
import { getWipStatus } from "@/lib/tools/production";
import { listProductionOrders } from "@/lib/tools/production";
import { listMachines } from "@/lib/tools/shop-floor";
import { listRoutes } from "@/lib/tools/product";

// Ensure tool modules register themselves
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";

interface TickRequestBody {
  scenario: SimulationScenario;
  tickNumber: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body: TickRequestBody = await request.json();
    const { scenario, tickNumber } = body;

    // --- Build simulator context from live DB state ---

    const [wipResult, ordersResult, machinesResult, routesResult] = await Promise.allSettled([
      getWipStatus({}),
      listProductionOrders({}),
      listMachines({}),
      listRoutes({}),
    ]);

    const wip = wipResult.status === "fulfilled"
      ? (wipResult.value as { workstation_id: string; workstation_name: string; unit_count: number }[])
      : [];

    const orders = ordersResult.status === "fulfilled"
      ? (ordersResult.value as { id: string; status: string; part_numbers: { name: string } | null; quantity_ordered: number; quantity_completed: number }[])
      : [];

    const machines = machinesResult.status === "fulfilled"
      ? (machinesResult.value as { id: string; name: string; status: string }[])
      : [];

    const routes = routesResult.status === "fulfilled"
      ? (routesResult.value as { name: string; route_steps: { step_number: number; name: string; ideal_cycle_time_seconds: number | null }[] }[])
      : [];

    const routeStepCycleTimes = routes.flatMap((r) =>
      r.route_steps
        .filter((s) => s.ideal_cycle_time_seconds != null)
        .map((s) => ({
          routeName: r.name,
          stepNumber: s.step_number,
          stepName: s.name,
          idealCycleTimeSeconds: s.ideal_cycle_time_seconds!,
        })),
    );

    const context: SimulatorContext = {
      activeScenario: scenario,
      tickNumber,
      tickIntervalMs: 2000, // informational only in prompt
      activeLineId: null,
      activeLineName: null,
      currentWip: wip.map((w) => ({
        workstationId: w.workstation_id,
        workstationName: w.workstation_name,
        unitCount: w.unit_count,
      })),
      openProductionOrders: orders
        .filter((o) => ["new", "scheduled", "running"].includes(o.status))
        .map((o) => ({
          id: o.id,
          partNumberName: (o.part_numbers as { name: string } | null)?.name ?? "Unknown",
          remaining: Math.max(0, o.quantity_ordered - o.quantity_completed),
        })),
      machineStates: machines.map((m) => ({
        machineId: m.id,
        machineName: m.name,
        status: m.status,
      })),
      routeStepCycleTimes: routeStepCycleTimes.length > 0 ? routeStepCycleTimes : undefined,
    };

    // --- Run simulator agent ---

    const mesTools = getToolsByNames(simulatorTools);
    const tools = toAISDKTools(mesTools, "simulator");

    const systemPrompt = buildSimulatorSystemPrompt(context);

    const result = await generateText({
      model: getModel(),
      temperature: 0,
      system: systemPrompt,
      prompt: `Execute tick #${tickNumber}. Review the current factory state and take the appropriate production actions.`,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(10),
    });

    const toolCallCount = result.steps.reduce(
      (acc, step) => acc + (step.toolCalls?.length ?? 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      tickNumber,
      toolCallCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tick failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
