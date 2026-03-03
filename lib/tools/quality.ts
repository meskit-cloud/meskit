import { z } from "zod";
import { registerTool } from "./registry";

// --- Stubs for M4: Quality Tools ---

// --- create_quality_event ---

export const createQualityEventSchema = z.object({
  unit_id: z.string().uuid(),
  workstation_id: z.string().uuid(),
  event_type: z.enum(["inspection", "rework", "scrap"]),
  result: z.enum(["pass", "fail"]),
  defect_code_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type CreateQualityEventInput = z.infer<
  typeof createQualityEventSchema
>;

registerTool({
  name: "create_quality_event",
  description: "Log an inspection, rework, or scrap event",
  schema: createQualityEventSchema,
  execute: async () => {
    throw new Error("create_quality_event not implemented until M4");
  },
});

// --- list_defect_codes ---

export const listDefectCodesSchema = z.object({});
export type ListDefectCodesInput = z.infer<typeof listDefectCodesSchema>;

registerTool({
  name: "list_defect_codes",
  description: "List all defect codes",
  schema: listDefectCodesSchema,
  execute: async () => {
    throw new Error("list_defect_codes not implemented until M4");
  },
});

// --- create_defect_code ---

export const createDefectCodeSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.enum(["minor", "major", "critical"]),
});
export type CreateDefectCodeInput = z.infer<typeof createDefectCodeSchema>;

registerTool({
  name: "create_defect_code",
  description: "Create a new defect code",
  schema: createDefectCodeSchema,
  execute: async () => {
    throw new Error("create_defect_code not implemented until M4");
  },
});
