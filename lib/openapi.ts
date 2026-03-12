import { z } from "zod";
import { getAllTools } from "./tools/registry";

// --- Zod → JSON Schema ---
// Covers the subset of Zod types used in MESkit tools.

type JsonSchema = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;

  switch (def.typeName) {
    case "ZodString": {
      const result: JsonSchema = { type: "string" };
      for (const check of def.checks ?? []) {
        if (check.kind === "uuid") result.format = "uuid";
        if (check.kind === "email") result.format = "email";
        if (check.kind === "min") result.minLength = check.value;
        if (check.kind === "max") result.maxLength = check.value;
      }
      return result;
    }
    case "ZodNumber": {
      const isInt = (def.checks ?? []).some((c: { kind: string }) => c.kind === "int");
      const result: JsonSchema = { type: isInt ? "integer" : "number" };
      for (const check of def.checks ?? []) {
        if (check.kind === "min") result.minimum = check.value;
        if (check.kind === "max") result.maximum = check.value;
      }
      return result;
    }
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    case "ZodLiteral":
      return { const: def.value };
    case "ZodArray":
      return { type: "array", items: zodToJsonSchema(def.type) };
    case "ZodOptional":
    case "ZodNullable":
      return zodToJsonSchema(def.innerType);
    case "ZodObject": {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(def.shape())) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldDef = (value as any)._def;
        const isOptional =
          fieldDef.typeName === "ZodOptional" || fieldDef.typeName === "ZodNullable";
        properties[key] = zodToJsonSchema(value as z.ZodType);
        if (!isOptional) required.push(key);
      }
      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    case "ZodUnion":
      return { oneOf: def.options.map((o: z.ZodType) => zodToJsonSchema(o)) };
    default:
      return {};
  }
}

// --- OpenAPI spec builder ---

export function buildOpenApiSpec(baseUrl: string) {
  const tools = getAllTools();

  const paths: Record<string, unknown> = {};

  for (const tool of tools) {
    const inputSchema = zodToJsonSchema(tool.schema);
    paths[`/api/tools/${tool.name}`] = {
      post: {
        summary: tool.description,
        operationId: tool.name,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: inputSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Tool result",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          "400": { description: "Validation error" },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Tool not in API key scopes" },
          "404": { description: "Tool not found" },
        },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "MESkit REST API",
      version: "1.0.0",
      description:
        "Auto-generated REST API for all registered MESkit tools. Authenticate with an API key via Bearer token.",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key (msk_...)",
        },
      },
    },
    paths,
  };
}
