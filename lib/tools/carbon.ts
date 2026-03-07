import { z } from "zod";
import { registerTool } from "./registry";

// --- Stubs for PCF Milestone: Carbon Tools ---

// --- get_carbon_footprint ---

export const getCarbonFootprintSchema = z.object({
  production_order_id: z.string().uuid(),
});
export type GetCarbonFootprintInput = z.infer<typeof getCarbonFootprintSchema>;

registerTool({
  name: "get_carbon_footprint",
  description: "Get the product carbon footprint (PCF) for a production order",
  schema: getCarbonFootprintSchema,
  execute: async () => {
    throw new Error("get_carbon_footprint not implemented until PCF milestone");
  },
});

// --- compare_carbon_by_line ---

export const compareCarbonByLineSchema = z.object({
  line_ids: z.array(z.string().uuid()).min(2),
});
export type CompareCarbonByLineInput = z.infer<typeof compareCarbonByLineSchema>;

registerTool({
  name: "compare_carbon_by_line",
  description: "Compare carbon footprint across manufacturing lines",
  schema: compareCarbonByLineSchema,
  execute: async () => {
    throw new Error("compare_carbon_by_line not implemented until PCF milestone");
  },
});

// --- export_pathfinder_json ---

export const exportPathfinderJsonSchema = z.object({
  production_order_id: z.string().uuid(),
});
export type ExportPathfinderJsonInput = z.infer<typeof exportPathfinderJsonSchema>;

registerTool({
  name: "export_pathfinder_json",
  description: "Export PCF data as WBCSD Pathfinder-compliant JSON",
  schema: exportPathfinderJsonSchema,
  execute: async () => {
    throw new Error("export_pathfinder_json not implemented until PCF milestone");
  },
});
