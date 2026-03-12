"use server";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { apiClientStorage } from "@/lib/supabase/server";
import { getAllTools, getTool, executeTool } from "@/lib/tools/registry";
import { zodToJsonSchema } from "@/lib/openapi";
import { ZodError } from "zod";

// Ensure all tools are registered
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";
import "@/lib/tools/org";
import "@/lib/tools/team";
import "@/lib/tools/plant";
import "@/lib/tools/carbon";
import "@/lib/tools/blockchain";

// --- API key validation (reused from tools/[toolName]/route.ts) ---

async function validateApiKey(
  rawKey: string,
): Promise<{ userId: string; scopes: string[] } | null> {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("api_keys")
      .select("user_id, scopes")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (!data) return null;

    // Update last_used_at fire-and-forget
    void supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash);

    return { userId: data.user_id as string, scopes: data.scopes as string[] };
  } catch {
    return null;
  }
}

// --- GET: Tool discovery ---

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const auth = await validateApiKey(authHeader.slice(7));
  if (!auth) {
    return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  }

  const allTools = getAllTools();

  // Filter by scopes unless wildcard
  const visibleTools = auth.scopes.includes("*")
    ? allTools
    : allTools.filter((t) => auth.scopes.includes(t.name));

  const tools = visibleTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.schema),
  }));

  return NextResponse.json({ tools });
}

// --- POST: Tool execution ---

interface McpRequest {
  tool: string;
  parameters: unknown;
}

export async function POST(request: NextRequest) {
  // Auth: extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  const rawKey = authHeader.slice(7);

  const auth = await validateApiKey(rawKey);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
  }

  // Parse body
  let body: McpRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected: { tool, parameters }" },
      { status: 400 },
    );
  }

  const { tool: toolName, parameters: input } = body;

  if (!toolName || typeof toolName !== "string") {
    return NextResponse.json(
      { error: "Missing 'tool' field. Expected: { tool: \"tool_name\", parameters: { ... } }" },
      { status: 400 },
    );
  }

  // Resolve tool
  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json({ error: `Tool not found: ${toolName}` }, { status: 404 });
  }

  // Scope check
  if (!auth.scopes.includes("*") && !auth.scopes.includes(toolName)) {
    return NextResponse.json(
      { error: `Tool '${toolName}' is not in your API key scopes` },
      { status: 403 },
    );
  }

  // Service role client bypasses RLS. We stub auth.getUser() so tools
  // resolve the correct user_id without needing a user-scoped JWT.
  const serviceClient = createServiceClient();
  const userStub = {
    id: auth.userId,
    aud: "authenticated",
    role: "authenticated",
    email: "",
    created_at: "",
    app_metadata: {},
    user_metadata: {},
  };
  serviceClient.auth.getUser = async () => ({
    data: { user: userStub as never },
    error: null,
  });

  // Execute tool within the service-role client context
  try {
    const result = await apiClientStorage.run(serviceClient, () =>
      executeTool(toolName, input ?? {}, { actor: "user" }),
    );

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: err.issues },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
