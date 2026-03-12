import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ count })),
  getModel: vi.fn(),
  toAISDKTools: vi.fn(),
  getToolsByNames: vi.fn(),
  createServiceClient: vi.fn(),
  apiClientStorage: { run: vi.fn() },
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

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mocks.createServiceClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  apiClientStorage: mocks.apiClientStorage,
}));

// Stub tool module side effects
vi.mock("@/lib/tools/shop-floor", () => ({}));
vi.mock("@/lib/tools/product", () => ({}));
vi.mock("@/lib/tools/production", () => ({}));
vi.mock("@/lib/tools/quality", () => ({}));
vi.mock("@/lib/tools/analytics", () => ({}));
vi.mock("@/lib/tools/org", () => ({}));
vi.mock("@/lib/tools/team", () => ({}));
vi.mock("@/lib/tools/plant", () => ({}));
vi.mock("@/lib/tools/maintenance", () => ({}));
vi.mock("@/lib/tools/mqtt", () => ({}));

import { dbChain } from "@/tests/mocks/supabase";
import { POST } from "./route";

function makeRequest(body: unknown, authHeader?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  return new NextRequest("http://localhost/api/nl", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function mockValidApiKey() {
  const serviceClient = {
    from: vi.fn().mockReturnValue(
      dbChain({ data: { user_id: "user-123", scopes: ["*"] } }),
    ),
    auth: { getUser: vi.fn() },
  };
  mocks.createServiceClient.mockReturnValue(serviceClient);
  return serviceClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getModel.mockReturnValue("mock-model");
  mocks.toAISDKTools.mockReturnValue({ list_lines: {} });
  mocks.getToolsByNames.mockReturnValue([{ name: "list_lines" }]);
  // Make apiClientStorage.run execute the callback directly
  mocks.apiClientStorage.run.mockImplementation((_client: unknown, fn: () => unknown) => fn());
});

describe("POST /api/nl", () => {
  // --- Authentication ---

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await POST(makeRequest({ query: "How many units?" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Missing Authorization header");
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const res = await POST(makeRequest({ query: "test" }, "Basic abc123"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Missing Authorization header");
  });

  it("returns 401 when API key is invalid", async () => {
    const serviceClient = {
      from: vi.fn().mockReturnValue(dbChain({ data: null })),
      auth: { getUser: vi.fn() },
    };
    mocks.createServiceClient.mockReturnValue(serviceClient);

    const res = await POST(makeRequest({ query: "test" }, "Bearer invalid-key"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid or inactive API key");
  });

  // --- Input validation ---

  it("returns 400 when query is missing", async () => {
    mockValidApiKey();
    const res = await POST(makeRequest({}, "Bearer valid-key"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required field: query");
  });

  it("returns 400 when query is empty string", async () => {
    mockValidApiKey();
    const res = await POST(makeRequest({ query: "   " }, "Bearer valid-key"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required field: query");
  });

  // --- Successful queries ---

  it("returns structured response with natural_language, data, and conversation_id", async () => {
    mockValidApiKey();
    mocks.generateText.mockResolvedValue({
      text: "You completed 42 units today.",
      steps: [
        {
          toolCalls: [
            { toolCallId: "tc-1", toolName: "get_throughput", input: { time_range: "today" } },
          ],
          toolResults: [
            { toolCallId: "tc-1", toolName: "get_throughput", output: { count: 42 } },
          ],
        },
      ],
    });

    const res = await POST(makeRequest({ query: "How many units completed today?" }, "Bearer valid-key"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.natural_language).toBe("You completed 42 units today.");
    expect(json.data).toEqual({
      tool: "get_throughput",
      input: { time_range: "today" },
      result: { count: 42 },
    });
    expect(json.conversation_id).toBeDefined();
    expect(typeof json.conversation_id).toBe("string");
  });

  it("returns null data when no tools are called", async () => {
    mockValidApiKey();
    mocks.generateText.mockResolvedValue({
      text: "Destructive operations are not available via the NL API.",
      steps: [],
    });

    const res = await POST(makeRequest({ query: "Delete all units" }, "Bearer valid-key"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.natural_language).toBe("Destructive operations are not available via the NL API.");
    expect(json.data).toBeNull();
  });

  it("returns array data when multiple tools are called", async () => {
    mockValidApiKey();
    mocks.generateText.mockResolvedValue({
      text: "Here are the throughput and yield reports.",
      steps: [
        {
          toolCalls: [
            { toolCallId: "tc-1", toolName: "get_throughput", input: {} },
            { toolCallId: "tc-2", toolName: "get_yield_report", input: {} },
          ],
          toolResults: [
            { toolCallId: "tc-1", toolName: "get_throughput", output: { count: 10 } },
            { toolCallId: "tc-2", toolName: "get_yield_report", output: { yield: 95 } },
          ],
        },
      ],
    });

    const res = await POST(makeRequest({ query: "Show throughput and yield" }, "Bearer valid-key"));
    const json = await res.json();

    expect(json.data).toEqual([
      { tool: "get_throughput", input: {}, result: { count: 10 } },
      { tool: "get_yield_report", input: {}, result: { yield: 95 } },
    ]);
  });

  // --- Multi-turn ---

  it("supports multi-turn conversations via conversation_id", async () => {
    mockValidApiKey();

    // First turn
    mocks.generateText.mockResolvedValue({
      text: "There are 2 running orders: PO-0001 and PO-0002.",
      steps: [
        {
          toolCalls: [
            { toolCallId: "tc-1", toolName: "list_production_orders", input: { status: "running" } },
          ],
          toolResults: [
            {
              toolCallId: "tc-1",
              toolName: "list_production_orders",
              output: [
                { order_number: "PO-0001", status: "running" },
                { order_number: "PO-0002", status: "running" },
              ],
            },
          ],
        },
      ],
    });

    const res1 = await POST(makeRequest({ query: "What orders are running?" }, "Bearer valid-key"));
    const json1 = await res1.json();
    const conversationId = json1.conversation_id;

    // Second turn — uses the same conversation_id
    mocks.generateText.mockResolvedValue({
      text: "PO-0001 is 75% complete.",
      steps: [
        {
          toolCalls: [
            { toolCallId: "tc-2", toolName: "get_order_summary", input: {} },
          ],
          toolResults: [
            { toolCallId: "tc-2", toolName: "get_order_summary", output: { completion: 75 } },
          ],
        },
      ],
    });

    const res2 = await POST(
      makeRequest({ query: "How is the first one doing?", conversation_id: conversationId }, "Bearer valid-key"),
    );
    const json2 = await res2.json();

    expect(json2.conversation_id).toBe(conversationId);

    // Verify generateText was called with accumulated messages
    const secondCall = mocks.generateText.mock.calls[1][0];
    expect(secondCall.messages).toHaveLength(3); // user1, assistant1, user2
    expect(secondCall.messages[0]).toEqual({ role: "user", content: "What orders are running?" });
    expect(secondCall.messages[1]).toEqual({
      role: "assistant",
      content: "There are 2 running orders: PO-0001 and PO-0002.",
    });
    expect(secondCall.messages[2]).toEqual({ role: "user", content: "How is the first one doing?" });
  });

  // --- Read-only safety ---

  it("only registers read-only tools (no destructive tools)", async () => {
    mockValidApiKey();
    mocks.generateText.mockResolvedValue({ text: "OK", steps: [] });

    await POST(makeRequest({ query: "test" }, "Bearer valid-key"));

    const toolNames = mocks.getToolsByNames.mock.calls[0][0] as string[];

    // Should include read-only tools
    expect(toolNames).toContain("list_lines");
    expect(toolNames).toContain("get_throughput");
    expect(toolNames).toContain("get_oee");
    expect(toolNames).toContain("get_order_summary");
    expect(toolNames).toContain("get_capability_snapshot");

    // Should NOT include destructive tools
    expect(toolNames).not.toContain("create_line");
    expect(toolNames).not.toContain("delete_line");
    expect(toolNames).not.toContain("update_line");
    expect(toolNames).not.toContain("scrap_unit");
    expect(toolNames).not.toContain("move_unit");
    expect(toolNames).not.toContain("generate_units");
    expect(toolNames).not.toContain("create_production_order");
    expect(toolNames).not.toContain("update_order_status");
    expect(toolNames).not.toContain("create_quality_event");
  });

  // --- Error handling ---

  it("returns 500 when generateText throws", async () => {
    mockValidApiKey();
    mocks.generateText.mockRejectedValue(new Error("LLM provider error"));

    const res = await POST(makeRequest({ query: "test" }, "Bearer valid-key"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("LLM provider error");
  });

  // --- API key scoping ---

  it("uses apiClientStorage.run to inject service client", async () => {
    mockValidApiKey();
    mocks.generateText.mockResolvedValue({ text: "OK", steps: [] });

    await POST(makeRequest({ query: "test" }, "Bearer valid-key"));

    expect(mocks.apiClientStorage.run).toHaveBeenCalledTimes(1);
    // First arg is the service client, second is the callback
    expect(typeof mocks.apiClientStorage.run.mock.calls[0][1]).toBe("function");
  });
});
