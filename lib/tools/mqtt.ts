import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";
import { getOrgContext } from "@/lib/org-context";

// --- query_mqtt_messages ---

export const queryMqttMessagesSchema = z.object({
  machine_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  start_time: z.string().optional().describe("ISO 8601 start time filter"),
  end_time: z.string().optional().describe("ISO 8601 end time filter"),
  limit: z.number().int().min(1).max(200).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});

export type QueryMqttMessagesInput = z.infer<typeof queryMqttMessagesSchema>;

export async function queryMqttMessages(input: QueryMqttMessagesInput) {
  const validated = queryMqttMessagesSchema.parse(input);
  const supabase = await createClient();

  const limit = validated.limit ?? 50;
  const offset = validated.offset ?? 0;

  let query = supabase
    .from("mqtt_messages")
    .select("*")
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (validated.machine_id) {
    query = query.eq("machine_id", validated.machine_id);
  }
  if (validated.event_type) {
    query = query.eq("event_type", validated.event_type);
  }
  if (validated.start_time) {
    query = query.gte("received_at", validated.start_time);
  }
  if (validated.end_time) {
    query = query.lte("received_at", validated.end_time);
  }

  const { data, error } = await query;

  if (error) throw new Error(`query_mqtt_messages failed: ${error.message}`);
  return data;
}

registerTool({
  name: "query_mqtt_messages",
  description:
    "Query MQTT messages with optional filters by machine, event type, and time range. Returns up to 200 messages ordered by most recent first.",
  schema: queryMqttMessagesSchema,
  execute: queryMqttMessages,
});

// --- get_sensor_statistics ---

export const getSensorStatisticsSchema = z.object({
  machine_id: z.string().uuid(),
  property: z.string().describe("The payload property to compute statistics for (e.g. 'temperature', 'pressure')"),
  start_time: z.string().optional().describe("ISO 8601 start time filter"),
  end_time: z.string().optional().describe("ISO 8601 end time filter"),
});

export type GetSensorStatisticsInput = z.infer<typeof getSensorStatisticsSchema>;

export async function getSensorStatistics(input: GetSensorStatisticsInput) {
  const validated = getSensorStatisticsSchema.parse(input);
  const supabase = await createClient();

  // Query measurement events for the specified machine
  let query = supabase
    .from("mqtt_messages")
    .select("payload")
    .eq("machine_id", validated.machine_id)
    .eq("event_type", "measurement")
    .order("received_at", { ascending: false })
    .limit(1000);

  if (validated.start_time) {
    query = query.gte("received_at", validated.start_time);
  }
  if (validated.end_time) {
    query = query.lte("received_at", validated.end_time);
  }

  const { data, error } = await query;

  if (error) throw new Error(`get_sensor_statistics failed: ${error.message}`);

  if (!data || data.length === 0) {
    return {
      machine_id: validated.machine_id,
      property: validated.property,
      count: 0,
      mean: null,
      std_dev: null,
      min: null,
      max: null,
    };
  }

  // Extract numeric values for the specified property from payload
  const values: number[] = [];
  for (const row of data) {
    const payload = row.payload as Record<string, unknown>;
    const val = payload[validated.property];
    if (typeof val === "number" && isFinite(val)) {
      values.push(val);
    }
  }

  if (values.length === 0) {
    return {
      machine_id: validated.machine_id,
      property: validated.property,
      count: 0,
      mean: null,
      std_dev: null,
      min: null,
      max: null,
    };
  }

  const count = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Standard deviation
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / count;
  const std_dev = Math.sqrt(variance);

  return {
    machine_id: validated.machine_id,
    property: validated.property,
    count,
    mean: Math.round(mean * 1000) / 1000,
    std_dev: Math.round(std_dev * 1000) / 1000,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
  };
}

registerTool({
  name: "get_sensor_statistics",
  description:
    "Compute statistics (mean, std_dev, min, max) for a sensor property from MQTT measurement messages. Specify the machine and the payload property name (e.g. 'temperature').",
  schema: getSensorStatisticsSchema,
  execute: getSensorStatistics,
});

// --- publish_mqtt_message ---

export const publishMqttMessageSchema = z.object({
  topic: z.string(),
  machine_id: z.string().uuid(),
  event_type: z.enum(["cycle_complete", "measurement", "fault"]),
  payload: z.record(z.unknown()),
});

export type PublishMqttMessageInput = z.infer<typeof publishMqttMessageSchema>;

export async function publishMqttMessage(input: PublishMqttMessageInput) {
  const validated = publishMqttMessageSchema.parse(input);
  const supabase = await createClient();
  const ctx = await getOrgContext();

  const { data, error } = await supabase
    .from("mqtt_messages")
    .insert({
      topic: validated.topic,
      machine_id: validated.machine_id,
      event_type: validated.event_type,
      payload: validated.payload,
      user_id: ctx.userId,
      org_id: ctx.orgId,
    })
    .select()
    .single();

  if (error) throw new Error(`publish_mqtt_message failed: ${error.message}`);
  return data;
}

registerTool({
  name: "publish_mqtt_message",
  description:
    "Write an MQTT message directly to the mqtt_messages table (for simulator use instead of a real MQTT broker). Event types: cycle_complete, measurement, fault.",
  schema: publishMqttMessageSchema,
  execute: publishMqttMessage,
});
