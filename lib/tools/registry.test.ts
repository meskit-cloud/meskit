import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  inferEntityType: vi.fn().mockReturnValue("unit"),
}));
vi.mock("@/lib/webhooks", () => ({
  fireWebhooksForTool: vi.fn().mockResolvedValue(undefined),
}));

import {
  registerTool,
  getTool,
  getAllTools,
  getToolsByNames,
  executeTool,
} from "./registry";
import { writeAuditLog } from "@/lib/audit";
import { fireWebhooksForTool } from "@/lib/webhooks";

// --- Registry operations ---

describe("registerTool / getTool / getAllTools / getToolsByNames", () => {
  const echoSchema = z.object({ value: z.string() });

  const echoTool = {
    name: "__test_echo__",
    description: "Echo tool for registry tests",
    schema: echoSchema,
    execute: async (input: { value: string }) => ({ echoed: input.value }),
  };

  beforeEach(() => {
    // Register fresh for each test (idempotent — same name overwrites)
    registerTool(echoTool);
  });

  it("getTool returns a registered tool by name", () => {
    const tool = getTool("__test_echo__");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("__test_echo__");
  });

  it("getTool returns undefined for an unknown tool", () => {
    expect(getTool("__nonexistent__")).toBeUndefined();
  });

  it("getAllTools includes the registered tool", () => {
    const tools = getAllTools();
    expect(tools.some((t) => t.name === "__test_echo__")).toBe(true);
  });

  it("getToolsByNames returns only the requested tools", () => {
    const tools = getToolsByNames(["__test_echo__", "__nonexistent__"]);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("__test_echo__");
  });
});

// --- executeTool ---

describe("executeTool", () => {
  const schema = z.object({ count: z.number().int().min(1) });
  let executeFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    executeFn = vi.fn().mockResolvedValue({ id: "result-id", count: 5 });
    registerTool({
      name: "__test_exec__",
      description: "Exec tool for tests",
      schema,
      execute: executeFn,
    });
  });

  it("throws when the tool name is not registered", async () => {
    await expect(executeTool("__nonexistent__", {})).rejects.toThrow(
      "Tool not found: __nonexistent__",
    );
  });

  it("throws when the input fails schema validation", async () => {
    await expect(
      executeTool("__test_exec__", { count: 0 }),
    ).rejects.toThrow();
  });

  it("returns the tool execute result on success", async () => {
    const result = await executeTool("__test_exec__", { count: 5 });
    expect(result).toEqual({ id: "result-id", count: 5 });
  });

  it("calls the execute function with validated input", async () => {
    await executeTool("__test_exec__", { count: 5 });
    expect(executeFn).toHaveBeenCalledWith({ count: 5 });
  });

  it("fires audit log (fire-and-forget, does not block)", async () => {
    const result = await executeTool("__test_exec__", { count: 5 }, { actor: "agent", agent_name: "operator" });
    expect(result).toBeDefined(); // result came back immediately
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it("fires webhooks with the tool name and result (fire-and-forget)", async () => {
    await executeTool("__test_exec__", { count: 5 });
    expect(fireWebhooksForTool).toHaveBeenCalledWith(
      "__test_exec__",
      // userId comes from result.user_id or validated.user_id; neither exists on this tool
      undefined,
      { id: "result-id", count: 5 },
    );
  });

  it("passes actor and agent_name to audit log", async () => {
    await executeTool("__test_exec__", { count: 5 }, {
      actor: "agent",
      agent_name: "simulator",
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "agent", agent_name: "simulator" }),
    );
  });

  it("extracts entity_id from result when result has id", async () => {
    await executeTool("__test_exec__", { count: 5 });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: "result-id" }),
    );
  });
});
