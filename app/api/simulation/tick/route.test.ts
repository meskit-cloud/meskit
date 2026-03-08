import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ count })),
  getModel: vi.fn(),
  toAISDKTools: vi.fn(),
  getToolsByNames: vi.fn(),
  buildSimulatorSystemPrompt: vi.fn(),
  getWipStatus: vi.fn(),
  listProductionOrders: vi.fn(),
  listMachines: vi.fn(),
  listRoutes: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  stepCountIs: mocks.stepCountIs,
}));

vi.mock("@/lib/ai/provider", () => ({
  getModel: mocks.getModel,
}));

vi.mock("@/lib/ai/tools", () => ({
  toAISDKTools: mocks.toAISDKTools,
}));

vi.mock("@/lib/tools/registry", () => ({
  getToolsByNames: mocks.getToolsByNames,
}));

vi.mock("@/lib/agents/simulator", () => ({
  buildSimulatorSystemPrompt: mocks.buildSimulatorSystemPrompt,
  simulatorTools: ["move_unit", "create_production_order"],
}));

vi.mock("@/lib/tools/production", () => ({
  getWipStatus: mocks.getWipStatus,
  listProductionOrders: mocks.listProductionOrders,
}));

vi.mock("@/lib/tools/shop-floor", () => ({
  listMachines: mocks.listMachines,
}));

vi.mock("@/lib/tools/product", () => ({
  listRoutes: mocks.listRoutes,
}));
vi.mock("@/lib/tools/quality", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }),
    },
  }),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/simulation/tick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getModel.mockReturnValue("mock-model");
  mocks.toAISDKTools.mockReturnValue({
    move_unit: { description: "move" },
  });
  mocks.getToolsByNames.mockReturnValue([{ name: "move_unit" }]);
  mocks.buildSimulatorSystemPrompt.mockReturnValue("system prompt");
  mocks.generateText.mockResolvedValue({
    steps: [{ toolCalls: [{ name: "move_unit" }] }, { toolCalls: [{}, {}] }],
  });
});

describe("POST /api/simulation/tick", () => {
  it("builds simulator context from live state and returns tool-call count", async () => {
    mocks.getWipStatus.mockResolvedValue([
      {
        workstation_id: "ws-1",
        workstation_name: "Assembly",
        unit_count: 2,
      },
    ]);
    mocks.listProductionOrders.mockResolvedValue([
      {
        id: "po-1",
        status: "running",
        part_numbers: { name: "Widget" },
        quantity_ordered: 10,
        quantity_completed: 4,
      },
      {
        id: "po-2",
        status: "closed",
        part_numbers: null,
        quantity_ordered: 5,
        quantity_completed: 5,
      },
    ]);
    mocks.listMachines.mockResolvedValue([
      { id: "machine-1", name: "Press", status: "EXECUTE" },
    ]);
    mocks.listRoutes.mockResolvedValue([
      {
        name: "Standard Assembly",
        route_steps: [
          { step_number: 1, name: "Assembly", ideal_cycle_time_seconds: 30 },
          { step_number: 2, name: "Test", ideal_cycle_time_seconds: null },
        ],
      },
    ]);

    const response = await POST(
      makeRequest({ scenario: "steady_state", tickNumber: 3 }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      tickNumber: 3,
      toolCallCount: 3,
    });

    expect(mocks.buildSimulatorSystemPrompt).toHaveBeenCalledWith({
      activeScenario: "steady_state",
      tickNumber: 3,
      tickIntervalMs: 2000,
      activeLineId: null,
      activeLineName: null,
      currentWip: [
        {
          workstationId: "ws-1",
          workstationName: "Assembly",
          unitCount: 2,
        },
      ],
      openProductionOrders: [
        {
          id: "po-1",
          partNumberName: "Widget",
          remaining: 6,
        },
      ],
      machineStates: [
        {
          machineId: "machine-1",
          machineName: "Press",
          status: "EXECUTE",
        },
      ],
      routeStepCycleTimes: [
        {
          routeName: "Standard Assembly",
          stepNumber: 1,
          stepName: "Assembly",
          idealCycleTimeSeconds: 30,
        },
      ],
    });

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "system prompt",
        prompt: expect.stringContaining("Execute tick #3"),
        tools: { move_unit: { description: "move" } },
        stopWhen: { count: 10 },
      }),
    );
  });

  it("keeps running when one of the live-state queries fails", async () => {
    mocks.getWipStatus.mockRejectedValue(new Error("db unavailable"));
    mocks.listProductionOrders.mockResolvedValue([]);
    mocks.listMachines.mockResolvedValue([]);
    mocks.listRoutes.mockResolvedValue([]);

    const response = await POST(
      makeRequest({ scenario: "ramp_up", tickNumber: 7 }),
    );

    expect(response.status).toBe(200);
    expect(mocks.buildSimulatorSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        activeScenario: "ramp_up",
        tickNumber: 7,
        currentWip: [],
        openProductionOrders: [],
        machineStates: [],
      }),
    );
  });

  it("returns 500 when the simulator run fails", async () => {
    mocks.getWipStatus.mockResolvedValue([]);
    mocks.listProductionOrders.mockResolvedValue([]);
    mocks.listMachines.mockResolvedValue([]);
    mocks.listRoutes.mockResolvedValue([]);
    mocks.generateText.mockRejectedValue(new Error("model unavailable"));

    const response = await POST(
      makeRequest({ scenario: "steady_state", tickNumber: 1 }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "model unavailable",
    });
  });
});
