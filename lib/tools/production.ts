import { z } from "zod";
import { registerTool } from "./registry";

// --- Stubs for M4: Production Tools ---

// --- generate_units ---

export const generateUnitsSchema = z.object({
  part_number_id: z.string().uuid(),
  route_id: z.string().uuid(),
  count: z.number().int().min(1).max(1000),
});
export type GenerateUnitsInput = z.infer<typeof generateUnitsSchema>;

registerTool({
  name: "generate_units",
  description: "Generate N units with auto-assigned serial numbers",
  schema: generateUnitsSchema,
  execute: async () => {
    throw new Error("generate_units not implemented until M4");
  },
});

// --- move_unit ---

export const moveUnitSchema = z.object({
  unit_id: z.string().uuid(),
});
export type MoveUnitInput = z.infer<typeof moveUnitSchema>;

registerTool({
  name: "move_unit",
  description: "Advance a unit to its next route step",
  schema: moveUnitSchema,
  execute: async () => {
    throw new Error("move_unit not implemented until M4");
  },
});

// --- scrap_unit ---

export const scrapUnitSchema = z.object({
  unit_id: z.string().uuid(),
  defect_code_id: z.string().uuid(),
  notes: z.string().optional(),
});
export type ScrapUnitInput = z.infer<typeof scrapUnitSchema>;

registerTool({
  name: "scrap_unit",
  description: "Mark a unit as scrapped",
  schema: scrapUnitSchema,
  execute: async () => {
    throw new Error("scrap_unit not implemented until M4");
  },
});

// --- get_wip_status ---

export const getWipStatusSchema = z.object({
  line_id: z.string().uuid().optional(),
  workstation_id: z.string().uuid().optional(),
});
export type GetWipStatusInput = z.infer<typeof getWipStatusSchema>;

registerTool({
  name: "get_wip_status",
  description: "Current units per workstation",
  schema: getWipStatusSchema,
  execute: async () => {
    throw new Error("get_wip_status not implemented until M4");
  },
});

// --- search_units ---

export const searchUnitsSchema = z.object({
  serial_number: z.string().optional(),
  status: z.enum(["in_progress", "completed", "scrapped"]).optional(),
  part_number_id: z.string().uuid().optional(),
});
export type SearchUnitsInput = z.infer<typeof searchUnitsSchema>;

registerTool({
  name: "search_units",
  description: "Search units with filters",
  schema: searchUnitsSchema,
  execute: async () => {
    throw new Error("search_units not implemented until M4");
  },
});
