import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/tools/registry", () => ({
  executeTool: vi.fn(),
  getTool: vi.fn(),
}));

import { executeTool, getTool } from "@/lib/tools/registry";
import { executeWebMCPAction } from "./adapter";

const mockExecuteTool = vi.mocked(executeTool);
const mockGetTool = vi.mocked(getTool);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: tool exists
  mockGetTool.mockReturnValue({
    name: "list_lines",
    description: "List lines",
    schema: {} as never,
    execute: vi.fn(),
  });
});

describe("executeWebMCPAction", () => {
  it("executes an allowed action and returns success", async () => {
    mockExecuteTool.mockResolvedValue([{ id: "line-1", name: "Line A" }]);

    const result = await executeWebMCPAction("list_lines", {}, "build");

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ id: "line-1", name: "Line A" }]);
  });

  it("rejects action not allowed in the given mode", async () => {
    const result = await executeWebMCPAction(
      "list_lines",
      {},
      "run", // list_lines is a build action, not run
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not available in run mode");
    expect(mockExecuteTool).not.toHaveBeenCalled();
  });

  it("rejects unknown action (not in registry)", async () => {
    mockGetTool.mockReturnValue(undefined);

    const result = await executeWebMCPAction(
      "create_line", // create_line IS allowed in build mode
      {},
      "build",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown action");
  });

  it("returns error when tool execution fails", async () => {
    mockExecuteTool.mockRejectedValue(new Error("Database error"));

    const result = await executeWebMCPAction("list_lines", {}, "build");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database error");
  });

  it("returns 'Unknown error' for non-Error exceptions", async () => {
    mockExecuteTool.mockRejectedValue("string error");

    const result = await executeWebMCPAction("list_lines", {}, "build");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error");
  });

  it("passes params and webmcp caller info to executeTool", async () => {
    mockExecuteTool.mockResolvedValue({});

    await executeWebMCPAction(
      "list_lines",
      { some: "params" },
      "build",
    );

    expect(mockExecuteTool).toHaveBeenCalledWith(
      "list_lines",
      { some: "params" },
      { actor: "user", agent_name: "webmcp" },
    );
  });

  it("enforces scope for settings actions", async () => {
    mockGetTool.mockReturnValue({
      name: "get_organization",
      description: "Get org",
      schema: {} as never,
      execute: vi.fn(),
    });
    mockExecuteTool.mockResolvedValue({ id: "org-1" });

    // Allowed in settings mode
    const allowed = await executeWebMCPAction(
      "get_organization",
      {},
      "settings",
    );
    expect(allowed.success).toBe(true);

    // Denied in build mode
    const denied = await executeWebMCPAction(
      "get_organization",
      {},
      "build",
    );
    expect(denied.success).toBe(false);
  });

  it("enforces scope for monitor actions", async () => {
    mockGetTool.mockReturnValue({
      name: "get_throughput",
      description: "Get throughput",
      schema: {} as never,
      execute: vi.fn(),
    });
    mockExecuteTool.mockResolvedValue({});

    const allowed = await executeWebMCPAction(
      "get_throughput",
      {},
      "monitor",
    );
    expect(allowed.success).toBe(true);

    const denied = await executeWebMCPAction(
      "get_throughput",
      {},
      "configure",
    );
    expect(denied.success).toBe(false);
  });
});
