import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { zodToJsonSchema, buildOpenApiSpec } from "./openapi";

// Mock the registry for buildOpenApiSpec
vi.mock("@/lib/tools/registry", () => ({
  getAllTools: vi.fn(),
}));

import { getAllTools } from "@/lib/tools/registry";

const mockGetAllTools = vi.mocked(getAllTools);

beforeEach(() => {
  vi.clearAllMocks();
});

// --- zodToJsonSchema ---

describe("zodToJsonSchema", () => {
  it("converts string", () => {
    expect(zodToJsonSchema(z.string())).toEqual({ type: "string" });
  });

  it("converts string with uuid format", () => {
    expect(zodToJsonSchema(z.string().uuid())).toEqual({
      type: "string",
      format: "uuid",
    });
  });

  it("converts string with email format", () => {
    expect(zodToJsonSchema(z.string().email())).toEqual({
      type: "string",
      format: "email",
    });
  });

  it("converts string with min/max length", () => {
    expect(zodToJsonSchema(z.string().min(3).max(50))).toEqual({
      type: "string",
      minLength: 3,
      maxLength: 50,
    });
  });

  it("converts number", () => {
    expect(zodToJsonSchema(z.number())).toEqual({ type: "number" });
  });

  it("converts integer", () => {
    expect(zodToJsonSchema(z.number().int())).toEqual({ type: "integer" });
  });

  it("converts integer with min/max", () => {
    expect(zodToJsonSchema(z.number().int().min(1).max(100))).toEqual({
      type: "integer",
      minimum: 1,
      maximum: 100,
    });
  });

  it("converts boolean", () => {
    expect(zodToJsonSchema(z.boolean())).toEqual({ type: "boolean" });
  });

  it("converts enum", () => {
    expect(zodToJsonSchema(z.enum(["a", "b", "c"]))).toEqual({
      type: "string",
      enum: ["a", "b", "c"],
    });
  });

  it("converts literal", () => {
    expect(zodToJsonSchema(z.literal("fixed"))).toEqual({ const: "fixed" });
  });

  it("converts array", () => {
    expect(zodToJsonSchema(z.array(z.string()))).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("converts optional (unwraps inner type)", () => {
    expect(zodToJsonSchema(z.string().optional())).toEqual({
      type: "string",
    });
  });

  it("converts nullable (unwraps inner type)", () => {
    expect(zodToJsonSchema(z.string().nullable())).toEqual({
      type: "string",
    });
  });

  it("converts object with required and optional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      active: z.boolean(),
    });

    const result = zodToJsonSchema(schema);

    expect(result).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["name", "active"],
    });
  });

  it("converts object with no required fields", () => {
    const schema = z.object({
      name: z.string().optional(),
    });

    const result = zodToJsonSchema(schema);

    expect(result).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
      },
    });
  });

  it("converts nested objects", () => {
    const schema = z.object({
      user: z.object({
        id: z.string().uuid(),
      }),
    });

    const result = zodToJsonSchema(schema);

    expect(result).toEqual({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
      },
      required: ["user"],
    });
  });

  it("converts union", () => {
    const schema = z.union([z.string(), z.number()]);

    const result = zodToJsonSchema(schema);

    expect(result).toEqual({
      oneOf: [{ type: "string" }, { type: "number" }],
    });
  });

  it("returns empty object for unknown types", () => {
    // z.unknown() is a ZodUnknown, not in the switch
    expect(zodToJsonSchema(z.unknown())).toEqual({});
  });
});

// --- buildOpenApiSpec ---

describe("buildOpenApiSpec", () => {
  it("builds a valid OpenAPI 3.0.3 spec", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "test_tool",
        description: "A test tool",
        schema: z.object({ name: z.string() }),
        execute: vi.fn(),
      },
    ]);

    const spec = buildOpenApiSpec("https://app.meskit.cloud");

    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.title).toBe("MESkit REST API");
    expect(spec.servers).toEqual([{ url: "https://app.meskit.cloud" }]);
  });

  it("creates a POST endpoint for each tool", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "list_lines",
        description: "List production lines",
        schema: z.object({}),
        execute: vi.fn(),
      },
      {
        name: "create_line",
        description: "Create a line",
        schema: z.object({ name: z.string() }),
        execute: vi.fn(),
      },
    ]);

    const spec = buildOpenApiSpec("https://example.com");
    const paths = spec.paths as Record<string, Record<string, unknown>>;

    expect(paths["/api/tools/list_lines"]).toBeDefined();
    expect(paths["/api/tools/create_line"]).toBeDefined();
    expect(paths["/api/tools/list_lines"]).toHaveProperty("post");
  });

  it("includes security scheme and per-endpoint security", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "test_tool",
        description: "test",
        schema: z.object({}),
        execute: vi.fn(),
      },
    ]);

    const spec = buildOpenApiSpec("https://example.com");

    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    const endpoint = (spec.paths as Record<string, Record<string, { security: unknown }>>)[
      "/api/tools/test_tool"
    ].post;
    expect(endpoint.security).toEqual([{ bearerAuth: [] }]);
  });

  it("includes standard response codes", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "test_tool",
        description: "test",
        schema: z.object({}),
        execute: vi.fn(),
      },
    ]);

    const spec = buildOpenApiSpec("https://example.com");
    const endpoint = (spec.paths as Record<string, Record<string, { responses: Record<string, unknown> }>>)[
      "/api/tools/test_tool"
    ].post;

    expect(endpoint.responses["200"]).toBeDefined();
    expect(endpoint.responses["400"]).toBeDefined();
    expect(endpoint.responses["401"]).toBeDefined();
    expect(endpoint.responses["403"]).toBeDefined();
    expect(endpoint.responses["404"]).toBeDefined();
  });

  it("converts tool schema to requestBody JSON schema", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "create_item",
        description: "Create an item",
        schema: z.object({
          name: z.string(),
          quantity: z.number().int().optional(),
        }),
        execute: vi.fn(),
      },
    ]);

    const spec = buildOpenApiSpec("https://example.com");
    const endpoint = (
      spec.paths as Record<
        string,
        Record<string, { requestBody: { content: { "application/json": { schema: Record<string, unknown> } } } }>
      >
    )["/api/tools/create_item"].post;

    const schema = endpoint.requestBody.content["application/json"].schema;
    expect(schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        quantity: { type: "integer" },
      },
      required: ["name"],
    });
  });

  it("handles empty tool registry", () => {
    mockGetAllTools.mockReturnValue([]);

    const spec = buildOpenApiSpec("https://example.com");

    expect(spec.paths).toEqual({});
  });
});
