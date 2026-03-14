import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});
vi.mock("@/lib/org-context", () => ({
  getOrgContext: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { dbChain } from "@/tests/mocks/supabase";
import {
  queryMqttMessages,
  getSensorStatistics,
  publishMqttMessage,
} from "./mqtt";

const mockCreateClient = vi.mocked(createClient);
const mockGetOrgContext = vi.mocked(getOrgContext);

const ORG_CONTEXT = {
  userId: "user-abc",
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};

const MACHINE_ID = "33333333-3333-3333-3333-333333333333";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = { from: vi.fn() };
  for (const chain of fromChains) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrgContext.mockResolvedValue(ORG_CONTEXT);
});

// --- query_mqtt_messages ---

describe("queryMqttMessages", () => {
  it("returns messages with default pagination", async () => {
    const messages = [
      { id: "m1", event_type: "measurement", machine_id: MACHINE_ID },
      { id: "m2", event_type: "fault", machine_id: MACHINE_ID },
    ];
    const chain = dbChain({ data: messages });
    // range() is called by mqtt.ts but not in our dbChain — need to add it
    chain.range = vi.fn().mockReturnValue(chain);
    makeClient([chain]);

    const result = await queryMqttMessages({});

    expect(result).toEqual(messages);
  });

  it("applies machine_id filter", async () => {
    const chain = dbChain({ data: [] });
    chain.range = vi.fn().mockReturnValue(chain);
    makeClient([chain]);

    await queryMqttMessages({ machine_id: MACHINE_ID });

    expect(chain.eq).toHaveBeenCalledWith("machine_id", MACHINE_ID);
  });

  it("applies event_type filter", async () => {
    const chain = dbChain({ data: [] });
    chain.range = vi.fn().mockReturnValue(chain);
    makeClient([chain]);

    await queryMqttMessages({ event_type: "fault" });

    expect(chain.eq).toHaveBeenCalledWith("event_type", "fault");
  });

  it("applies time range filters", async () => {
    const chain = dbChain({ data: [] });
    chain.range = vi.fn().mockReturnValue(chain);
    makeClient([chain]);

    await queryMqttMessages({
      start_time: "2026-03-01T00:00:00Z",
      end_time: "2026-03-02T00:00:00Z",
    });

    expect(chain.gte).toHaveBeenCalledWith(
      "received_at",
      "2026-03-01T00:00:00Z",
    );
    expect(chain.lte).toHaveBeenCalledWith(
      "received_at",
      "2026-03-02T00:00:00Z",
    );
  });

  it("throws on Supabase error", async () => {
    const chain = dbChain({ error: { message: "db error" } });
    chain.range = vi.fn().mockReturnValue(chain);
    makeClient([chain]);

    await expect(queryMqttMessages({})).rejects.toThrow(
      "query_mqtt_messages failed",
    );
  });
});

// --- get_sensor_statistics ---

describe("getSensorStatistics", () => {
  it("computes statistics for temperature values", async () => {
    const rows = [
      { payload: { temperature: 20 } },
      { payload: { temperature: 30 } },
      { payload: { temperature: 25 } },
      { payload: { temperature: 35 } },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "temperature",
    });

    expect(result.count).toBe(4);
    expect(result.mean).toBe(27.5);
    expect(result.min).toBe(20);
    expect(result.max).toBe(35);
    expect(result.std_dev).toBeGreaterThan(0);
  });

  it("returns zeros when no data", async () => {
    makeClient([dbChain({ data: [] })]);

    const result = await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "temperature",
    });

    expect(result.count).toBe(0);
    expect(result.mean).toBeNull();
    expect(result.std_dev).toBeNull();
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
  });

  it("returns zeros when property not in payload", async () => {
    const rows = [
      { payload: { pressure: 100 } },
      { payload: { pressure: 200 } },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "temperature",
    });

    expect(result.count).toBe(0);
    expect(result.mean).toBeNull();
  });

  it("skips non-numeric and non-finite values", async () => {
    const rows = [
      { payload: { temperature: 20 } },
      { payload: { temperature: "hot" } },
      { payload: { temperature: NaN } },
      { payload: { temperature: Infinity } },
      { payload: { temperature: 30 } },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "temperature",
    });

    expect(result.count).toBe(2);
    expect(result.mean).toBe(25);
    expect(result.min).toBe(20);
    expect(result.max).toBe(30);
  });

  it("rounds values to 3 decimal places", async () => {
    const rows = [
      { payload: { x: 1 } },
      { payload: { x: 2 } },
      { payload: { x: 3 } },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "x",
    });

    // mean = 2, std_dev = sqrt(2/3) ≈ 0.8165
    expect(result.mean).toBe(2);
    expect(result.std_dev).toBe(0.816);
  });

  it("applies time range filters", async () => {
    const chain = dbChain({ data: [] });
    makeClient([chain]);

    await getSensorStatistics({
      machine_id: MACHINE_ID,
      property: "temperature",
      start_time: "2026-03-01T00:00:00Z",
      end_time: "2026-03-02T00:00:00Z",
    });

    expect(chain.gte).toHaveBeenCalledWith(
      "received_at",
      "2026-03-01T00:00:00Z",
    );
    expect(chain.lte).toHaveBeenCalledWith(
      "received_at",
      "2026-03-02T00:00:00Z",
    );
  });

  it("throws on Supabase error", async () => {
    makeClient([dbChain({ error: { message: "db error" } })]);

    await expect(
      getSensorStatistics({
        machine_id: MACHINE_ID,
        property: "temperature",
      }),
    ).rejects.toThrow("get_sensor_statistics failed");
  });
});

// --- publish_mqtt_message ---

describe("publishMqttMessage", () => {
  it("publishes a measurement message", async () => {
    const published = {
      id: "msg-1",
      topic: "factory/machine1/temp",
      machine_id: MACHINE_ID,
      event_type: "measurement",
      payload: { temperature: 42.5 },
      user_id: "user-abc",
      org_id: "org-123",
    };
    makeClient([dbChain({ data: published })]);

    const result = await publishMqttMessage({
      topic: "factory/machine1/temp",
      machine_id: MACHINE_ID,
      event_type: "measurement",
      payload: { temperature: 42.5 },
    });

    expect(result).toEqual(published);
  });

  it("publishes a fault message", async () => {
    const published = { id: "msg-2", event_type: "fault" };
    makeClient([dbChain({ data: published })]);

    const result = await publishMqttMessage({
      topic: "factory/machine1/fault",
      machine_id: MACHINE_ID,
      event_type: "fault",
      payload: { code: "E001", severity: "critical" },
    });

    expect(result.event_type).toBe("fault");
  });

  it("publishes a cycle_complete message", async () => {
    const published = { id: "msg-3", event_type: "cycle_complete" };
    makeClient([dbChain({ data: published })]);

    const result = await publishMqttMessage({
      topic: "factory/machine1/cycle",
      machine_id: MACHINE_ID,
      event_type: "cycle_complete",
      payload: { cycle_time: 12.5 },
    });

    expect(result.event_type).toBe("cycle_complete");
  });

  it("throws on insert error", async () => {
    makeClient([dbChain({ error: { message: "insert failed" } })]);

    await expect(
      publishMqttMessage({
        topic: "test",
        machine_id: MACHINE_ID,
        event_type: "measurement",
        payload: {},
      }),
    ).rejects.toThrow("publish_mqtt_message failed");
  });

  it("rejects invalid event_type", async () => {
    await expect(
      publishMqttMessage({
        topic: "test",
        machine_id: MACHINE_ID,
        event_type: "unknown" as never,
        payload: {},
      }),
    ).rejects.toThrow();
  });
});
