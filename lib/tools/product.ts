import { z } from "zod";
import { registerTool } from "./registry";

// --- Stubs for M3: Product & Process Tools ---

// --- list_part_numbers ---

export const listPartNumbersSchema = z.object({});
export type ListPartNumbersInput = z.infer<typeof listPartNumbersSchema>;

registerTool({
  name: "list_part_numbers",
  description: "List all part numbers",
  schema: listPartNumbersSchema,
  execute: async () => {
    throw new Error("list_part_numbers not implemented until M3");
  },
});

// --- create_part_number ---

export const createPartNumberSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type CreatePartNumberInput = z.infer<typeof createPartNumberSchema>;

registerTool({
  name: "create_part_number",
  description: "Create a part number",
  schema: createPartNumberSchema,
  execute: async () => {
    throw new Error("create_part_number not implemented until M3");
  },
});

// --- get_bom ---

export const getBomSchema = z.object({
  part_number_id: z.string().uuid(),
});
export type GetBomInput = z.infer<typeof getBomSchema>;

registerTool({
  name: "get_bom",
  description: "Get BOM for a part number",
  schema: getBomSchema,
  execute: async () => {
    throw new Error("get_bom not implemented until M3");
  },
});

// --- set_bom_entry ---

export const setBomEntrySchema = z.object({
  part_number_id: z.string().uuid(),
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  position: z.number().int().min(1),
});
export type SetBomEntryInput = z.infer<typeof setBomEntrySchema>;

registerTool({
  name: "set_bom_entry",
  description: "Add/update a BOM entry",
  schema: setBomEntrySchema,
  execute: async () => {
    throw new Error("set_bom_entry not implemented until M3");
  },
});

// --- list_routes ---

export const listRoutesSchema = z.object({
  part_number_id: z.string().uuid().optional(),
});
export type ListRoutesInput = z.infer<typeof listRoutesSchema>;

registerTool({
  name: "list_routes",
  description: "List routes, optionally filtered by part number",
  schema: listRoutesSchema,
  execute: async () => {
    throw new Error("list_routes not implemented until M3");
  },
});

// --- create_route ---

export const createRouteSchema = z.object({
  part_number_id: z.string().uuid(),
  name: z.string(),
  steps: z.array(
    z.object({
      workstation_id: z.string().uuid(),
      step_number: z.number().int().min(1),
      name: z.string(),
      pass_fail_gate: z.boolean().optional(),
    }),
  ),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;

registerTool({
  name: "create_route",
  description: "Create a route with steps",
  schema: createRouteSchema,
  execute: async () => {
    throw new Error("create_route not implemented until M3");
  },
});

// --- configure_serial_algorithm ---

export const configureSerialAlgorithmSchema = z.object({
  part_number_id: z.string().uuid(),
  prefix: z.string(),
  pad_length: z.number().int().min(1),
});
export type ConfigureSerialAlgorithmInput = z.infer<
  typeof configureSerialAlgorithmSchema
>;

registerTool({
  name: "configure_serial_algorithm",
  description: "Set serial number algorithm for a part number",
  schema: configureSerialAlgorithmSchema,
  execute: async () => {
    throw new Error("configure_serial_algorithm not implemented until M3");
  },
});
