import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  apiClientRun: vi.fn((_client: unknown, fn: () => unknown) => fn()),
  getTool: vi.fn(),
  executeTool: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mocks.createServiceClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  apiClientStorage: {
    run: mocks.apiClientRun,
  },
}));

vi.mock("@/lib/tools/registry", () => ({
  getTool: mocks.getTool,
  executeTool: mocks.executeTool,
}));

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

import { dbChain, mockSupabaseClient } from "@/tests/mocks/supabase";
import { POST } from "./route";

function makeRequest(
  toolName: string,
  options: {
    token?: string;
    body?: unknown;
    search?: string;
  } = {},
) {
  const url = new URL(`http://localhost/api/tools/${toolName}`);
  if (options.search) {
    url.search = options.search;
  }

  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest(url, {
    method: "POST",
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function mockAuthorizedApiKey(scopes: string[]) {
  const client = mockSupabaseClient({
    fromChains: [
      dbChain({
        data: {
          user_id: "user-1",
          scopes,
        },
      }),
      dbChain({ data: null }),
    ],
  });
  // Add a stubable auth.getUser
  (client as Record<string, unknown>).auth = {
    getUser: vi.fn(),
  };
  mocks.createServiceClient.mockReturnValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiClientRun.mockImplementation((_client, fn) => fn());
});

describe("POST /api/tools/[toolName]", () => {
  it("requires a bearer token", async () => {
    const response = await POST(makeRequest("generate_units"), {
      params: Promise.resolve({ toolName: "generate_units" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Missing Authorization header",
    });
  });

  it("returns 404 when the tool is unknown", async () => {
    mockAuthorizedApiKey(["*"]);
    mocks.getTool.mockReturnValue(undefined);

    const response = await POST(makeRequest("missing_tool", { token: "valid-key" }), {
      params: Promise.resolve({ toolName: "missing_tool" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Tool not found: missing_tool",
    });
  });

  it("rejects tools outside the API key scope", async () => {
    mockAuthorizedApiKey(["move_unit"]);
    mocks.getTool.mockReturnValue({ name: "generate_units" });

    const response = await POST(
      makeRequest("generate_units", { token: "valid-key", body: {} }),
      { params: Promise.resolve({ toolName: "generate_units" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Tool 'generate_units' is not in your API key scopes",
    });
  });

  it("returns validation errors from tool execution as 400 responses", async () => {
    mockAuthorizedApiKey(["*"]);
    mocks.getTool.mockReturnValue({ name: "generate_units" });
    mocks.executeTool.mockRejectedValue(
      new ZodError([
        {
          code: "custom",
          path: ["count"],
          message: "count must be positive",
        },
      ]),
    );

    const response = await POST(
      makeRequest("generate_units", {
        token: "valid-key",
        body: { count: 0 },
      }),
      { params: Promise.resolve({ toolName: "generate_units" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Validation error",
      issues: [
        {
          code: "custom",
          path: ["count"],
          message: "count must be positive",
        },
      ],
    });
  });

  it("executes the tool via service-role client with stubbed auth and paginates arrays", async () => {
    const client = mockAuthorizedApiKey(["*"]);
    mocks.getTool.mockReturnValue({
      name: "search_units",
      schema: z.object({}),
    });
    mocks.executeTool.mockResolvedValue([
      { id: "unit-1" },
      { id: "unit-2" },
      { id: "unit-3" },
    ]);

    const response = await POST(
      makeRequest("search_units", {
        token: "valid-key",
        body: {},
        search: "?limit=2&cursor=0",
      }),
      { params: Promise.resolve({ toolName: "search_units" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: "unit-1" }, { id: "unit-2" }],
      next_cursor: 2,
      total: 3,
    });

    // Service client is passed to apiClientStorage (not a JWT-scoped client)
    expect(mocks.apiClientRun).toHaveBeenCalledWith(
      client,
      expect.any(Function),
    );
    // auth.getUser is stubbed to return the API key's user_id
    const stubbedGetUser = (client as { auth: { getUser: () => Promise<unknown> } }).auth.getUser;
    const { data } = await stubbedGetUser() as { data: { user: { id: string } } };
    expect(data.user.id).toBe("user-1");

    expect(mocks.executeTool).toHaveBeenCalledWith("search_units", {}, {
      actor: "user",
    });
  });
});
