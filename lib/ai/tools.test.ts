import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  tool: vi.fn((opts) => ({
    description: opts.description,
    inputSchema: opts.inputSchema,
    execute: opts.execute,
  })),
}));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
  inferEntityType: vi.fn((name: string) => name.split("_")[0]),
}));

import { z } from "zod";
import { toAISDKTools } from "./tools";
import { writeAuditLog } from "@/lib/audit";
import type { MesTool } from "@/lib/tools/registry";

const mockWriteAuditLog = vi.mocked(writeAuditLog);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTool(overrides: Partial<MesTool> = {}): MesTool {
  return {
    name: overrides.name ?? "test_tool",
    description: overrides.description ?? "A test tool",
    schema: overrides.schema ?? z.object({ id: z.string() }),
    execute: overrides.execute ?? vi.fn().mockResolvedValue({ id: "result-1" }),
  };
}

describe("toAISDKTools", () => {
  it("converts MES tools to AI SDK tool format", () => {
    const tools = toAISDKTools([makeTool({ name: "list_lines" })]);

    expect(tools).toHaveProperty("list_lines");
    expect(tools.list_lines).toHaveProperty("description");
    expect(tools.list_lines).toHaveProperty("execute");
  });

  it("converts multiple tools", () => {
    const tools = toAISDKTools([
      makeTool({ name: "tool_a" }),
      makeTool({ name: "tool_b" }),
      makeTool({ name: "tool_c" }),
    ]);

    expect(Object.keys(tools)).toEqual(["tool_a", "tool_b", "tool_c"]);
  });

  it("preserves tool description", () => {
    const tools = toAISDKTools([
      makeTool({ description: "Does something cool" }),
    ]);

    expect(tools.test_tool.description).toBe("Does something cool");
  });

  it("executes the underlying tool function", async () => {
    const executeFn = vi.fn().mockResolvedValue({ id: "abc", name: "Line 1" });
    const tools = toAISDKTools([makeTool({ execute: executeFn })]);

    const result = await tools.test_tool.execute({ id: "abc" });

    expect(executeFn).toHaveBeenCalledWith({ id: "abc" });
    expect(result).toEqual({ id: "abc", name: "Line 1" });
  });

  it("writes an audit log after successful execution", async () => {
    const tools = toAISDKTools(
      [makeTool({ name: "create_line" })],
      "operator",
    );

    await tools.create_line.execute({ id: "line-1" });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create_line",
        actor: "agent",
        agent_name: "operator",
        entity_id: "line-1",
      }),
    );
  });

  it("extracts entity_id from input.id", async () => {
    const tools = toAISDKTools([
      makeTool({
        execute: vi.fn().mockResolvedValue({ name: "no id here" }),
      }),
    ]);

    await tools.test_tool.execute({ id: "input-id-123" });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: "input-id-123" }),
    );
  });

  it("extracts entity_id from result.id when input has none", async () => {
    const schema = z.object({ name: z.string() });
    const tools = toAISDKTools([
      makeTool({
        schema,
        execute: vi.fn().mockResolvedValue({ id: "result-id-456" }),
      }),
    ]);

    await tools.test_tool.execute({ name: "test" });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: "result-id-456" }),
    );
  });

  it("returns error object instead of throwing on execution failure", async () => {
    const tools = toAISDKTools([
      makeTool({
        execute: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      }),
    ]);

    const result = await tools.test_tool.execute({ id: "x" });

    expect(result).toEqual({ error: "DB connection lost" });
  });

  it("returns 'Unknown error' for non-Error exceptions", async () => {
    const tools = toAISDKTools([
      makeTool({
        execute: vi.fn().mockRejectedValue("string error"),
      }),
    ]);

    const result = await tools.test_tool.execute({ id: "x" });

    expect(result).toEqual({ error: "Unknown error" });
  });

  it("does not write audit log on execution failure", async () => {
    const tools = toAISDKTools([
      makeTool({
        execute: vi.fn().mockRejectedValue(new Error("fail")),
      }),
    ]);

    await tools.test_tool.execute({ id: "x" });

    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it("returns empty object for empty tool list", () => {
    const tools = toAISDKTools([]);

    expect(tools).toEqual({});
  });
});
