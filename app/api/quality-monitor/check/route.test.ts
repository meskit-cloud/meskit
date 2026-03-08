import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ count })),
  getModel: vi.fn(),
  toAISDKTools: vi.fn(),
  getToolsByNames: vi.fn(),
  buildQualityAnalystSystemPrompt: vi.fn(),
  writeAuditLog: vi.fn(),
  createClient: vi.fn(),
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

vi.mock("@/lib/agents/quality", () => ({
  buildQualityAnalystSystemPrompt: mocks.buildQualityAnalystSystemPrompt,
  qualityAnalystTools: ["get_analytics_summary"],
  qualityAnalystTriggers: {
    yieldDrop: { windowSize: 50, defaultThreshold: 0.9 },
    defectClustering: { windowMinutes: 30, defaultCount: 3 },
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/tools/production", () => ({}));
vi.mock("@/lib/tools/quality", () => ({}));
vi.mock("@/lib/tools/analytics", () => ({}));

import { dbChain, mockSupabaseClient } from "@/tests/mocks/supabase";
import { POST } from "./route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/quality-monitor/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getModel.mockReturnValue("mock-model");
  mocks.toAISDKTools.mockReturnValue({});
  mocks.getToolsByNames.mockReturnValue([{ name: "get_analytics_summary" }]);
  mocks.buildQualityAnalystSystemPrompt.mockReturnValue("quality system");
  mocks.generateText.mockResolvedValue({ text: "Investigate station drift." });
});

describe("POST /api/quality-monitor/check", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.createClient.mockResolvedValue(mockSupabaseClient({ user: null }) as never);

    const response = await POST(
      makeRequest({
        triggerEvent: "quality_event",
        triggerData: {
          id: "qe-1",
          workstation_id: "ws-1",
          result: "fail",
          timestamp: "2026-03-08T10:00:00.000Z",
        },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
  });

  it("skips the agent when neither threshold is crossed", async () => {
    const recentEvents = Array.from({ length: 10 }, (_, index) => ({
      result: index === 0 ? "fail" : "pass",
    }));
    mocks.createClient.mockResolvedValue(
      mockSupabaseClient({
        fromChains: [dbChain({ data: recentEvents })],
      }) as never,
    );

    const response = await POST(
      makeRequest({
        triggerEvent: "quality_event",
        triggerData: {
          id: "qe-1",
          workstation_id: "ws-1",
          result: "fail",
          timestamp: "2026-03-08T10:00:00.000Z",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      alert: null,
      triggered: false,
    });
    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it("invokes the quality analyst and writes an alert when thresholds trip", async () => {
    const recentEvents = Array.from({ length: 10 }, (_, index) => ({
      result: index < 8 ? "fail" : "pass",
    }));
    const clusterEvents = [{ id: "qe-1" }, { id: "qe-2" }, { id: "qe-3" }];

    mocks.createClient.mockResolvedValue(
      mockSupabaseClient({
        fromChains: [
          dbChain({ data: recentEvents }),
          dbChain({ data: clusterEvents }),
        ],
      }) as never,
    );

    const response = await POST(
      makeRequest({
        triggerEvent: "quality_event",
        triggerData: {
          id: "qe-9",
          workstation_id: "ws-1",
          defect_code_id: "defect-1",
          result: "fail",
          timestamp: "2026-03-08T10:00:00.000Z",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      alert: "Investigate station drift.",
      triggered: true,
    });

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "quality system",
        prompt: expect.stringContaining("YIELD DROP detected"),
      }),
    );
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("DEFECT CLUSTER detected"),
      }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quality_alert",
        actor: "agent",
        agent_name: "quality_analyst",
        entity_id: "qe-9",
        metadata: expect.objectContaining({
          workstation_id: "ws-1",
          yield_drop: true,
          defect_cluster: true,
          alert: "Investigate station drift.",
        }),
      }),
    );
  });
});
