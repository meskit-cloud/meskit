import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { dbChain } from "@/tests/mocks/supabase";
import { POST } from "./route";

const mockCreateClient = vi.mocked(createClient);

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/simulation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/simulation", () => {
  it.each(["start", "pause"] as const)(
    "acknowledges %s without touching the database",
    async (action) => {
      const response = await POST(makeRequest({ action }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, action });
      expect(mockCreateClient).not.toHaveBeenCalled();
    },
  );

  it("rejects reset when there is no authenticated user", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const response = await POST(makeRequest({ action: "reset" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
  });

  it("closes open orders and scraps in-progress units on reset", async () => {
    const productionOrdersChain = dbChain({ data: null });
    const unitsChain = dbChain({ data: null });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi
        .fn()
        .mockReturnValueOnce(productionOrdersChain)
        .mockReturnValueOnce(unitsChain),
    };
    mockCreateClient.mockResolvedValue(client as never);

    const response = await POST(makeRequest({ action: "reset" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, action: "reset" });

    expect(client.from).toHaveBeenNthCalledWith(1, "production_orders");
    expect(productionOrdersChain.update).toHaveBeenCalledWith({ status: "closed" });
    expect(productionOrdersChain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(productionOrdersChain.in).toHaveBeenCalledWith("status", [
      "new",
      "scheduled",
      "running",
    ]);

    expect(client.from).toHaveBeenNthCalledWith(2, "units");
    expect(unitsChain.update).toHaveBeenCalledWith({ status: "scrapped" });
    expect(unitsChain.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(unitsChain.eq).toHaveBeenNthCalledWith(2, "status", "in_progress");
  });

  it("returns 400 for unknown actions", async () => {
    const response = await POST(makeRequest({ action: "rewind" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unknown action: rewind",
    });
  });
});
