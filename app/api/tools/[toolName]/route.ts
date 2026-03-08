"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient as createBaseClient } from "@supabase/supabase-js";
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

// --- JWT creation (no external deps) ---
// Requires SUPABASE_JWT_SECRET (Supabase dashboard → Settings → API → JWT Secret)

function createUserJWT(userId: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not configured");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
      iss: "supabase",
      sub: userId,
      role: "authenticated",
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

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

  // Create user-scoped Supabase client via JWT
  let jwt: string;
  try {
    jwt = createUserJWT(auth.userId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "JWT creation failed" },
      { status: 500 },
    );
  }

  const userClient = createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  // Execute tool within the user-scoped client context
  try {
    const result = await apiClientStorage.run(userClient, () =>
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
