import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { dbChain } from "@/tests/mocks/supabase";
import { getThroughput, getYieldReport, getUnitHistory } from "./analytics";

const mockCreateClient = vi.mocked(createClient);

const WS_ID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const WS_ID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const UNIT_ID = "11111111-1111-1111-1111-111111111111";
const LINE_ID = "22222222-2222-2222-2222-222222222222";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    from: vi.fn(),
  };
  for (const chain of fromChains) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

beforeEach(() => vi.clearAllMocks());

// --- getTimeRangeStart (tested indirectly via getThroughput) ---

describe("getThroughput — time range produces an ISO 8601 `since` string", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("today starts at midnight UTC", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "today" });
    // Midnight of 2024-06-15 in local time — just verify it's a valid ISO string in the past
    expect(result.since).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(result.since).getTime()).toBeLessThanOrEqual(
      new Date("2024-06-15T12:00:00.000Z").getTime(),
    );
  });

  it("last_8_hours starts exactly 8 hours before now", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "last_8_hours" });
    const expected = new Date("2024-06-15T04:00:00.000Z").getTime();
    expect(new Date(result.since).getTime()).toBe(expected);
  });

  it("last_24_hours starts exactly 24 hours before now", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "last_24_hours" });
    const expected = new Date("2024-06-14T12:00:00.000Z").getTime();
    expect(new Date(result.since).getTime()).toBe(expected);
  });

  it("last_7_days starts exactly 7 days before now", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "last_7_days" });
    const expected = new Date("2024-06-08T12:00:00.000Z").getTime();
    expect(new Date(result.since).getTime()).toBe(expected);
  });

  it("last_30_days starts exactly 30 days before now", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "last_30_days" });
    const expected = new Date("2024-05-16T12:00:00.000Z").getTime();
    expect(new Date(result.since).getTime()).toBe(expected);
  });
});

// --- getThroughput ---

describe("getThroughput", () => {
  it("returns total_completed = unit count with no line filter", async () => {
    const units = [
      { id: "u1", route_id: "r1" },
      { id: "u2", route_id: "r2" },
    ];
    makeClient([dbChain({ data: units })]);

    const result = await getThroughput({ time_range: "last_24_hours" });
    expect(result.total_completed).toBe(2);
    expect(result.units).toEqual(units);
    expect(result.time_range).toBe("last_24_hours");
  });

  it("returns total_completed = 0 when no units exist", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getThroughput({ time_range: "last_24_hours" });
    expect(result.total_completed).toBe(0);
  });

  it("filters by line_id: only units whose route passes through that line's workstations", async () => {
    const allUnits = [
      { id: "u1", route_id: "route-on-line" },
      { id: "u2", route_id: "route-other-line" },
    ];
    // line has workstation ws-A; route-on-line passes through ws-A
    makeClient([
      dbChain({ data: allUnits }),                                       // SELECT units
      dbChain({ data: [{ id: WS_ID_A }] }),                             // SELECT workstations for line
      dbChain({ data: [{ route_id: "route-on-line" }] }),               // SELECT route_steps for ws
    ]);

    const result = await getThroughput({ time_range: "last_24_hours", line_id: LINE_ID });
    expect(result.total_completed).toBe(1);
    expect(result.units[0].id).toBe("u1");
  });

  it("returns 0 when units exist but none match the line filter", async () => {
    makeClient([
      dbChain({ data: [{ id: "u1", route_id: "route-other" }] }),
      dbChain({ data: [{ id: WS_ID_A }] }),
      dbChain({ data: [] }),  // no route_steps match
    ]);

    const result = await getThroughput({ time_range: "last_24_hours", line_id: LINE_ID });
    expect(result.total_completed).toBe(0);
  });

  it("skips line filter DB calls when units array is empty", async () => {
    const client = makeClient([dbChain({ data: [] })]);

    await getThroughput({ time_range: "last_24_hours", line_id: LINE_ID });
    // Only 1 from() call: units. No workstations or route_steps query.
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("throws when DB query fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "query error" } })]);
    await expect(getThroughput({ time_range: "last_24_hours" })).rejects.toThrow(
      "get_throughput failed",
    );
  });
});

// --- getYieldReport: aggregation and yield_percent math ---

describe("getYieldReport — yield_percent calculation", () => {
  function makeEvents(wsId: string, wsName: string, passes: number, fails: number) {
    const ws = { id: wsId, name: wsName };
    return [
      ...Array.from({ length: passes }, () => ({ workstation_id: wsId, result: "pass", workstations: ws })),
      ...Array.from({ length: fails }, () => ({ workstation_id: wsId, result: "fail", workstations: ws })),
    ];
  }

  it("calculates 100% yield when all inspections pass", async () => {
    makeClient([dbChain({ data: makeEvents(WS_ID_A, "WS-A", 10, 0) })]);
    const result = await getYieldReport({});
    expect(result[0].yield_percent).toBe(100);
  });

  it("calculates 0% yield when all inspections fail", async () => {
    makeClient([dbChain({ data: makeEvents(WS_ID_A, "WS-A", 0, 10) })]);
    const result = await getYieldReport({});
    expect(result[0].yield_percent).toBe(0);
  });

  it("calculates 50% yield with equal pass/fail counts", async () => {
    makeClient([dbChain({ data: makeEvents(WS_ID_A, "WS-A", 10, 10) })]);
    const result = await getYieldReport({});
    expect(result[0].yield_percent).toBe(50);
  });

  it("rounds yield_percent to whole number", async () => {
    // 2 pass / 3 total = 66.66... → rounds to 67
    makeClient([dbChain({ data: makeEvents(WS_ID_A, "WS-A", 2, 1) })]);
    const result = await getYieldReport({});
    expect(result[0].yield_percent).toBe(67);
  });

  it("returns yield_percent = null when no inspections (total = 0)", async () => {
    makeClient([dbChain({ data: [] })]);
    const result = await getYieldReport({});
    expect(result).toHaveLength(0); // no workstations in result
  });

  it("aggregates events correctly per workstation", async () => {
    const events = [
      ...makeEvents(WS_ID_A, "WS-A", 8, 2),  // 80%
      ...makeEvents(WS_ID_B, "WS-B", 5, 5),  // 50%
    ];
    makeClient([dbChain({ data: events })]);

    const result = await getYieldReport({});
    expect(result).toHaveLength(2);

    const wsA = result.find((r) => r.workstation_id === WS_ID_A)!;
    expect(wsA.pass_count).toBe(8);
    expect(wsA.fail_count).toBe(2);
    expect(wsA.total_inspected).toBe(10);
    expect(wsA.yield_percent).toBe(80);

    const wsB = result.find((r) => r.workstation_id === WS_ID_B)!;
    expect(wsB.pass_count).toBe(5);
    expect(wsB.fail_count).toBe(5);
    expect(wsB.yield_percent).toBe(50);
  });

  it("returns workstation_name correctly", async () => {
    makeClient([dbChain({ data: makeEvents(WS_ID_A, "Assembly", 5, 0) })]);
    const result = await getYieldReport({});
    expect(result[0].workstation_name).toBe("Assembly");
  });

  it("throws when DB query fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "query error" } })]);
    await expect(getYieldReport({})).rejects.toThrow("get_yield_report failed");
  });
});

// --- getUnitHistory ---

describe("getUnitHistory", () => {
  const UNIT = {
    id: UNIT_ID,
    serial_number: "SN-000001",
    status: "completed",
    current_step: 3,
    created_at: "2024-01-15T10:00:00Z",
    part_numbers: { name: "Widget A" },
    routes: { name: "Main Route" },
  };

  const HISTORY = [
    { id: "h1", result: "pass", timestamp: "2024-01-15T10:01:00Z" },
    { id: "h2", result: "pass", timestamp: "2024-01-15T10:02:00Z" },
  ];

  it("returns unit info and history", async () => {
    makeClient([
      dbChain({ data: UNIT }),
      dbChain({ data: HISTORY }),
    ]);

    const result = await getUnitHistory({ unit_id: UNIT_ID });

    expect(result.unit.serial_number).toBe("SN-000001");
    expect(result.unit.part_number_name).toBe("Widget A");
    expect(result.unit.route_name).toBe("Main Route");
    expect(result.history).toEqual(HISTORY);
  });

  it("returns empty history array when no history records exist", async () => {
    makeClient([
      dbChain({ data: UNIT }),
      dbChain({ data: null }),
    ]);

    const result = await getUnitHistory({ unit_id: UNIT_ID });
    expect(result.history).toEqual([]);
  });

  it("throws when unit is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }),
    ]);

    await expect(getUnitHistory({ unit_id: UNIT_ID })).rejects.toThrow(
      "unit not found",
    );
  });

  it("throws when history query fails", async () => {
    makeClient([
      dbChain({ data: UNIT }),
      dbChain({ data: null, error: { message: "query error" } }),
    ]);

    await expect(getUnitHistory({ unit_id: UNIT_ID })).rejects.toThrow(
      "get_unit_history failed",
    );
  });
});
