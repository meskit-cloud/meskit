import { z } from "zod";
import { registerTool } from "./registry";

// --- Stubs for M5: Analytics Tools ---

const timeRangeEnum = z.enum([
  "today",
  "last_8_hours",
  "last_24_hours",
  "last_7_days",
  "last_30_days",
]);

// --- get_throughput ---

export const getThroughputSchema = z.object({
  line_id: z.string().uuid().optional(),
  time_range: timeRangeEnum,
});
export type GetThroughputInput = z.infer<typeof getThroughputSchema>;

registerTool({
  name: "get_throughput",
  description: "Units completed over time",
  schema: getThroughputSchema,
  execute: async () => {
    throw new Error("get_throughput not implemented until M5");
  },
});

// --- get_yield_report ---

export const getYieldReportSchema = z.object({
  workstation_id: z.string().uuid().optional(),
  time_range: timeRangeEnum.optional(),
});
export type GetYieldReportInput = z.infer<typeof getYieldReportSchema>;

registerTool({
  name: "get_yield_report",
  description: "Pass/fail ratio by workstation",
  schema: getYieldReportSchema,
  execute: async () => {
    throw new Error("get_yield_report not implemented until M5");
  },
});

// --- get_unit_history ---

export const getUnitHistorySchema = z.object({
  unit_id: z.string().uuid(),
});
export type GetUnitHistoryInput = z.infer<typeof getUnitHistorySchema>;

registerTool({
  name: "get_unit_history",
  description: "Full route history for a unit",
  schema: getUnitHistorySchema,
  execute: async () => {
    throw new Error("get_unit_history not implemented until M5");
  },
});
