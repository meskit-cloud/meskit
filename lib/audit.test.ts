import { describe, it, expect, vi, beforeEach } from "vitest";
import { inferEntityType, writeAuditLog } from "./audit";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { dbChain, mockSupabaseClient } from "@/tests/mocks/supabase";

const mockCreateClient = vi.mocked(createClient);

// --- inferEntityType ---

describe("inferEntityType", () => {
  it.each([
    ["create_line", "line"],
    ["update_line", "line"],
    ["delete_workstation", "workstation"],
    ["list_machines", "machine"],
    ["generate_units", "unit"],
    ["move_unit", "unit"],
    ["scrap_unit", "unit"],
    ["create_route", "route"],
    ["create_part_number", "part_number"],
    ["create_bom_entry", "bom_entry"],
    ["update_serial_algorithm", "serial_algorithm"],
    ["create_defect_code", "defect_code"],
    ["create_quality_event", "quality_event"],
  ])("'%s' → '%s'", (toolName, expected) => {
    expect(inferEntityType(toolName)).toBe(expected);
  });

  it("'record_test_result' → undefined (contains no known entity substring)", () => {
    // 'record_test_result' does not contain 'quality_event' or any other entity token
    expect(inferEntityType("record_test_result")).toBeUndefined();
  });

  it("'search_units' → 'unit' (substring match on 'unit')", () => {
    // Demonstrates the substring-match behaviour: search_units contains 'unit'
    expect(inferEntityType("search_units")).toBe("unit");
  });

  it.each([
    ["get_analytics_summary"],
    ["list_production_orders"],
    ["update_order_status"],
    ["get_wip_status"],
  ])("'%s' → undefined (no matching entity)", (toolName) => {
    expect(inferEntityType(toolName)).toBeUndefined();
  });
});

// --- writeAuditLog ---

describe("writeAuditLog", () => {
  let mockSupabase: ReturnType<typeof mockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = mockSupabaseClient({
      fromChains: [dbChain({ data: null })],
    });
    mockCreateClient.mockResolvedValue(mockSupabase as never);
  });

  it("inserts an audit entry with the correct fields", async () => {
    await writeAuditLog({
      action: "create_line",
      actor: "user",
      entity_type: "line",
      entity_id: "entity-abc",
      metadata: { name: "Line A" },
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("audit_log");
    const chain = mockSupabase.from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "test-user-id",
        actor: "user",
        action: "create_line",
        entity_type: "line",
        entity_id: "entity-abc",
      }),
    );
  });

  it("defaults actor to 'user' when not specified", async () => {
    await writeAuditLog({ action: "move_unit" });

    const chain = mockSupabase.from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "user" }),
    );
  });

  it("records agent name when actor is 'agent'", async () => {
    await writeAuditLog({
      action: "generate_units",
      actor: "agent",
      agent_name: "operator_assistant",
    });

    const chain = mockSupabase.from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "agent", agent_name: "operator_assistant" }),
    );
  });

  it("skips the insert and warns when there is no authenticated user", async () => {
    mockSupabase = mockSupabaseClient({ user: null });
    mockCreateClient.mockResolvedValue(mockSupabase as never);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await writeAuditLog({ action: "create_line" });

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("No authenticated user"),
      expect.stringContaining("create_line"),
    );
  });

  it("never throws when the DB insert fails", async () => {
    mockSupabase = mockSupabaseClient({
      fromChains: [dbChain({ error: { message: "db error" } })],
    });
    mockCreateClient.mockResolvedValue(mockSupabase as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(writeAuditLog({ action: "create_line" })).resolves.toBeUndefined();
  });

  it("never throws when createClient itself throws", async () => {
    mockCreateClient.mockRejectedValue(new Error("connection failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(writeAuditLog({ action: "create_line" })).resolves.toBeUndefined();
  });
});
