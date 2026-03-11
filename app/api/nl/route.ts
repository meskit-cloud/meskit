import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { getModel } from "@/lib/ai/provider";
import { toAISDKTools } from "@/lib/ai/tools";
import { getToolsByNames } from "@/lib/tools/registry";
import { createServiceClient } from "@/lib/supabase/service";
import { apiClientStorage } from "@/lib/supabase/server";

// Ensure tool modules are registered
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

// --- Read-only tool subset (no destructive operations) ---

const NL_TOOLS: string[] = [
  // Shop floor (read-only)
  "list_lines",
  "list_workstations",
  "list_machines",
  // Product & process (read-only)
  "list_part_numbers",
  "list_items",
  "get_bom",
  "list_routes",
  "get_serial_algorithm",
  // Production (read-only)
  "get_wip_status",
  "search_units",
  "list_production_orders",
  // Quality (read-only)
  "list_defect_codes",
  "list_test_definitions",
  // Analytics
  "get_throughput",
  "get_yield_report",
  "get_unit_history",
  "get_oee",
  "get_order_summary",
  "get_capability_snapshot",
];

// --- In-memory conversation store ---

interface Conversation {
  messages: ModelMessage[];
  createdAt: number;
}

const conversations = new Map<string, Conversation>();

// Evict conversations older than 30 minutes
const CONVERSATION_TTL_MS = 30 * 60 * 1000;

function evictStaleConversations() {
  const now = Date.now();
  for (const [id, conv] of conversations) {
    if (now - conv.createdAt > CONVERSATION_TTL_MS) {
      conversations.delete(id);
    }
  }
}

// --- System prompt ---

const NL_SYSTEM_PROMPT = `You are the **MESkit API** — a natural language interface for querying manufacturing data.

## Your Role

You answer questions about shop floor operations, production status, quality metrics, and analytics. You are **read-only** — you cannot create, update, delete, or modify any data.

## Instructions

1. **Always use tool calls to answer questions.** Do not guess or make up data.
2. **Be concise and factual.** Return data-driven answers.
3. **If a query requires a destructive operation (create, update, delete, scrap, move, generate), refuse clearly.** Say: "Destructive operations are not available via the NL API. Use the MES application directly."
4. **Format numbers and dates clearly.** Use percentages for yield and OEE. Use ISO 8601 for timestamps.
5. **For follow-up questions, use conversation context.** If the user says "the first one" or "that order", resolve it from prior messages.

## Available Data

You can query:
- Shop floor structure (lines, workstations, machines)
- Product definitions (part numbers, BOMs, routes)
- Production status (WIP, units, production orders)
- Quality data (defect codes, test definitions)
- Analytics (throughput, yield, OEE, order progress, workstation capability)

## Examples

- "How many units completed today?" → call get_throughput with time_range "today"
- "What's the yield at Station 2?" → call get_yield_report
- "Show me OEE for Assembly" → call get_oee with line filter
- "Trace serial SMX-00042" → call get_unit_history
- "What orders are running?" → call list_production_orders with status "running"
- "How is PO-0001 doing?" → call get_order_summary with production_order_id`;

// --- API key validation (reused from REST API) ---

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

// --- Request/response types ---

interface NlRequestBody {
  query: string;
  conversation_id?: string;
}

interface NlResponse {
  natural_language: string;
  data: unknown;
  conversation_id: string;
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  // Auth: extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }
  const rawKey = authHeader.slice(7);

  const auth = await validateApiKey(rawKey);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or inactive API key" },
      { status: 401 },
    );
  }

  // Parse body
  let body: NlRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
    return NextResponse.json(
      { error: "Missing required field: query" },
      { status: 400 },
    );
  }

  // Evict stale conversations periodically
  evictStaleConversations();

  // Resolve or create conversation
  const conversationId = body.conversation_id || crypto.randomUUID();
  let conversation = conversations.get(conversationId);
  if (!conversation) {
    conversation = { messages: [], createdAt: Date.now() };
    conversations.set(conversationId, conversation);
  }

  // Add user message
  conversation.messages.push({ role: "user", content: body.query.trim() });

  // Prepare tools
  const mesTools = getToolsByNames(NL_TOOLS);
  const tools = toAISDKTools(mesTools, "nl_api");

  // Service role client with user stub (same pattern as REST API)
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

  try {
    const result = await apiClientStorage.run(serviceClient, () =>
      generateText({
        model: getModel(),
        temperature: 0,
        system: NL_SYSTEM_PROMPT,
        messages: [...conversation!.messages],
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        stopWhen: stepCountIs(10),
      }),
    );

    // Extract text and tool results
    const naturalLanguage = result.text || "";
    const toolResults: unknown[] = [];

    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        const matching = step.toolResults.find(
          (r) => r.toolCallId === call.toolCallId,
        );
        if (matching) {
          toolResults.push({
            tool: call.toolName,
            input: call.input,
            result: matching.output,
          });
        }
      }
    }

    // Add assistant message to conversation history
    conversation.messages.push({ role: "assistant", content: naturalLanguage });

    const response: NlResponse = {
      natural_language: naturalLanguage,
      data: toolResults.length === 1 ? toolResults[0] : toolResults.length > 0 ? toolResults : null,
      conversation_id: conversationId,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
