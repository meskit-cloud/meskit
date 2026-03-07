import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  action: string;
  actor?: "user" | "agent";
  agent_name?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an entry to the audit_log table.
 * Automatically resolves the current user from Supabase Auth.
 * Failures are logged but never thrown — audit must not break operations.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[audit] No authenticated user — skipping audit log for:", entry.action);
      return;
    }

    const { error } = await supabase.from("audit_log").insert({
      user_id: user.id,
      actor: entry.actor ?? "user",
      agent_name: entry.agent_name ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata ?? null,
    });
    if (error) {
      console.error("[audit] Insert failed:", error.message);
    }
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

/**
 * Infer entity_type from a tool name (e.g. "create_line" → "line").
 */
export function inferEntityType(toolName: string): string | undefined {
  const knownEntities = [
    "line",
    "workstation",
    "machine",
    "unit",
    "route",
    "part_number",
    "item",
    "bom_entry",
    "serial_algorithm",
    "defect_code",
    "quality_event",
  ];
  for (const entity of knownEntities) {
    if (toolName.includes(entity)) return entity;
  }
  return undefined;
}
