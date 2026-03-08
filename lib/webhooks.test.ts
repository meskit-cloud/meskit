import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { fireWebhooksForTool } from "./webhooks";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { dbChain, mockSupabaseClient } from "@/tests/mocks/supabase";

const mockCreateServiceClient = vi.mocked(createServiceClient);

const SUBSCRIPTION = {
  url: "https://example.com/webhook",
  secret: "mysecret",
  events: ["unit_moved"],
};

function makeServiceClient(subs: typeof SUBSCRIPTION[] | null) {
  const client = mockSupabaseClient({
    fromChains: [dbChain({ data: subs })],
  });
  mockCreateServiceClient.mockReturnValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
});

describe("fireWebhooksForTool — event routing", () => {
  it("does nothing for tools not mapped to a webhook event", async () => {
    makeServiceClient([SUBSCRIPTION]);
    await fireWebhooksForTool("generate_units", "user-1", {});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing when userId is undefined", async () => {
    makeServiceClient([SUBSCRIPTION]);
    await fireWebhooksForTool("move_unit", undefined, {});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing when there are no active subscriptions", async () => {
    makeServiceClient([]);
    await fireWebhooksForTool("move_unit", "user-1", {});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing when subs query returns null", async () => {
    makeServiceClient(null);
    await fireWebhooksForTool("move_unit", "user-1", {});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fires fetch for move_unit → unit_moved", async () => {
    makeServiceClient([SUBSCRIPTION]);
    await fireWebhooksForTool("move_unit", "user-1", { id: "unit-1" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("fires fetch for create_quality_event → quality_event", async () => {
    makeServiceClient([{ ...SUBSCRIPTION, events: ["quality_event"] }]);
    await fireWebhooksForTool("create_quality_event", "user-1", {});
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("fires fetch for update_machine_status → machine_status_change", async () => {
    makeServiceClient([{ ...SUBSCRIPTION, events: ["machine_status_change"] }]);
    await fireWebhooksForTool("update_machine_status", "user-1", {});
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe("fireWebhooksForTool — subscription filtering", () => {
  it("skips subscriptions that don't include the event", async () => {
    makeServiceClient([{ ...SUBSCRIPTION, events: ["quality_event"] }]);
    await fireWebhooksForTool("move_unit", "user-1", {});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends to subscriptions with wildcard '*' events", async () => {
    makeServiceClient([{ ...SUBSCRIPTION, events: ["*"] }]);
    await fireWebhooksForTool("move_unit", "user-1", {});
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("fires once per matching subscription", async () => {
    makeServiceClient([
      SUBSCRIPTION,
      { ...SUBSCRIPTION, url: "https://other.com/hook" },
    ]);
    await fireWebhooksForTool("move_unit", "user-1", {});
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("fireWebhooksForTool — HMAC signature", () => {
  it("sets X-Webhook-Signature header with sha256= prefix", async () => {
    makeServiceClient([SUBSCRIPTION]);
    const data = { id: "unit-1" };
    await fireWebhooksForTool("move_unit", "user-1", data);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const sig = (options.headers as Record<string, string>)[
      "X-Webhook-Signature"
    ];
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("signature matches HMAC-SHA256 of the payload with the subscription secret", async () => {
    makeServiceClient([SUBSCRIPTION]);
    const data = { id: "unit-1" };
    await fireWebhooksForTool("move_unit", "user-1", data);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = options.body as string;
    const sig = (options.headers as Record<string, string>)[
      "X-Webhook-Signature"
    ];

    const expected =
      "sha256=" +
      crypto.createHmac("sha256", SUBSCRIPTION.secret).update(body).digest("hex");

    expect(sig).toBe(expected);
  });

  it("sets X-Webhook-Event header to the event name", async () => {
    makeServiceClient([SUBSCRIPTION]);
    await fireWebhooksForTool("move_unit", "user-1", {});

    const [, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((options.headers as Record<string, string>)["X-Webhook-Event"]).toBe(
      "unit_moved",
    );
  });
});

describe("fireWebhooksForTool — resilience", () => {
  it("never throws when the service client throws", async () => {
    mockCreateServiceClient.mockImplementation(() => {
      throw new Error("service unavailable");
    });
    await expect(
      fireWebhooksForTool("move_unit", "user-1", {}),
    ).resolves.toBeUndefined();
  });

  it("never throws when fetch rejects", async () => {
    makeServiceClient([SUBSCRIPTION]);
    vi.mocked(global.fetch).mockRejectedValue(new Error("network error"));
    await expect(
      fireWebhooksForTool("move_unit", "user-1", {}),
    ).resolves.toBeUndefined();
  });
});
