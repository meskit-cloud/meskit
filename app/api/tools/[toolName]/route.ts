"use server";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { apiClientStorage } from "@/lib/supabase/server";
import { getTool, executeTool } from "@/lib/tools/registry";
import { ZodError } from "zod";

// Ensure all tools are registered
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

// --- API key validation ---

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

// --- Route handler ---

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> },
) {
  const { toolName } = await params;

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

  // Parse body
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    input = {};
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
      executeTool(toolName, input, { actor: "user" }),
    );

    // Pagination: if result is array and limit/cursor params present, slice
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "0", 10);
    const cursor = parseInt(url.searchParams.get("cursor") ?? "0", 10);

    if (Array.isArray(result) && limit > 0) {
      const page = result.slice(cursor, cursor + limit);
      const nextCursor = cursor + limit < result.length ? cursor + limit : null;
      return NextResponse.json({ data: page, next_cursor: nextCursor, total: result.length });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation error", issues: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
