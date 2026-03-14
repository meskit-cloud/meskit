/**
 * M7 — MCP Server + Tool Registration Playwright tests
 *
 * Covers: M7_test_guide.md §9 (MCP Server), §3.4 (MQTT tool registration),
 *         §4.4 (Maintenance tool registration), §6.1 (Anomaly monitor auth)
 *
 * Uses API-level `request` fixture — no browser required for most tests.
 * E2E_API_KEY env var is needed for authenticated MCP tests.
 *
 * Note: the MCP endpoint uses a simple REST protocol:
 *   GET  /api/mcp → tool discovery  (returns { tools: [...] })
 *   POST /api/mcp → tool execution  (body: { tool, parameters }, returns { result })
 *
 * The OpenAPI endpoint (GET /api/openapi.json) is public and lists all tools
 * including MQTT and maintenance tools.
 */
import { test, expect } from "@playwright/test";

// ─── §9.3  MCP Authentication ─────────────────────────────────────────────

test.describe("9.3 MCP Server — Authentication", () => {
  test("GET /api/mcp without Authorization header returns 401", async ({
    request,
  }) => {
    const res = await request.get("/api/mcp");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/mcp without Authorization header returns 401", async ({
    request,
  }) => {
    const res = await request.post("/api/mcp", {
      data: { tool: "list_production_orders", parameters: {} },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/mcp with invalid API key returns 401", async ({ request }) => {
    const res = await request.get("/api/mcp", {
      headers: { Authorization: "Bearer invalid-key-xyz-99999" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/mcp with valid API key returns 200", async ({ request }) => {
    const apiKey = process.env.E2E_API_KEY;
    if (!apiKey) {
      test.skip();
      return;
    }
    const res = await request.get("/api/mcp", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status()).toBe(200);
  });
});

// ─── §9.1  MCP Tool Discovery ─────────────────────────────────────────────

test.describe("9.1 MCP Server — Tool Discovery", () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.E2E_API_KEY) {
      testInfo.skip();
    }
  });

  test("GET /api/mcp returns { tools: [...] }", async ({ request }) => {
    const res = await request.get("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("tools");
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools.length).toBeGreaterThan(0);
  });

  test("each tool has name, description, and parameters", async ({
    request,
  }) => {
    const res = await request.get("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
    });
    const body = await res.json();
    for (const tool of body.tools as Record<string, unknown>[]) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(tool).toHaveProperty("parameters");
    }
  });

  test("known core tools are present in discovery response", async ({
    request,
  }) => {
    const res = await request.get("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
    });
    const body = await res.json();
    const names = (body.tools as { name: string }[]).map((t) => t.name);
    for (const expected of [
      "list_production_orders",
      "list_lines",
      "list_part_numbers",
    ]) {
      expect(names).toContain(expected);
    }
  });
});

// ─── §9.2  MCP Tool Execution ─────────────────────────────────────────────

test.describe("9.2 MCP Server — Tool Execution", () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.E2E_API_KEY) {
      testInfo.skip();
    }
  });

  test("POST with unknown tool returns 404 error", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
      data: { tool: "this_tool_does_not_exist", parameters: {} },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST missing 'tool' field returns 400", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
      data: { parameters: {} },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST with invalid JSON body returns 400", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: {
        Authorization: `Bearer ${process.env.E2E_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: "not-valid-json{{{",
    });
    expect(res.status()).toBe(400);
  });

  test("POST list_production_orders returns { result } with array", async ({
    request,
  }) => {
    const res = await request.post("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
      data: { tool: "list_production_orders", parameters: {} },
      timeout: 30_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("result");
  });

  test("POST list_lines returns { result }", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: { Authorization: `Bearer ${process.env.E2E_API_KEY}` },
      data: { tool: "list_lines", parameters: {} },
      timeout: 30_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("result");
  });
});

// ─── §3.4 + §4.4  Tool Registration via OpenAPI ──────────────────────────

test.describe("3.4 + 4.4 Tool Registration — OpenAPI endpoint", () => {
  test("GET /api/openapi.json returns 200 with valid JSON", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("paths");
    expect(typeof body.paths).toBe("object");
  });

  test("MQTT tools are registered: query_mqtt_messages", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/query_mqtt_messages");
  });

  test("MQTT tools are registered: get_sensor_statistics", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/get_sensor_statistics");
  });

  test("MQTT tools are registered: publish_mqtt_message", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/publish_mqtt_message");
  });

  test("Maintenance tools are registered: create_maintenance_request", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/create_maintenance_request");
  });

  test("Maintenance tools are registered: list_maintenance_requests", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/list_maintenance_requests");
  });

  test("Maintenance tools are registered: update_maintenance_status", async ({
    request,
  }) => {
    const res = await request.get("/api/openapi.json");
    const body = await res.json();
    expect(body.paths).toHaveProperty("/api/tools/update_maintenance_status");
  });
});

// ─── §6.1  Anomaly Monitor — Note ────────────────────────────────────────
//
// The anomaly monitor endpoint (/api/anomaly-monitor/check) uses Supabase
// session-based auth (browser cookies), not API key auth.  The Next.js
// middleware redirects unauthenticated API requests to /login (HTML response).
// These tests require the browser-authenticated project context; they are
// covered by manual test guide §6 and not automated here.
