import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

// Tool names → webhook event names
const TOOL_TO_EVENT: Record<string, string> = {
  move_unit: "unit_moved",
  create_quality_event: "quality_event",
  update_machine_status: "machine_status_change",
};

/**
 * Fire webhooks for tools that map to a webhook event.
 * Fire-and-forget — never blocks the tool response.
 * Silently skips if SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export async function fireWebhooksForTool(
  toolName: string,
  userId: string | undefined,
  data: unknown,
): Promise<void> {
  const event = TOOL_TO_EVENT[toolName];
  if (!event || !userId) return;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const supabase = createServiceClient();

    const { data: subs } = await supabase
      .from("webhook_subscriptions")
      .select("url, secret, events")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const sub of subs) {
      const subscribedEvents = sub.events as string[];
      if (!subscribedEvents.includes(event) && !subscribedEvents.includes("*")) continue;

      const signature = crypto
        .createHmac("sha256", sub.secret as string)
        .update(payload)
        .digest("hex");

      fetch(sub.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": event,
        },
        body: payload,
      }).catch(() => {}); // fire-and-forget
    }
  } catch {
    // Webhooks are best-effort — never throw
  }
}
