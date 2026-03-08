import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";

// --- create_quality_event ---

export const createQualityEventSchema = z.object({
  unit_id: z.string().uuid(),
  workstation_id: z.string().uuid(),
  event_type: z.enum(["inspection", "rework", "scrap"]),
  result: z.enum(["pass", "fail"]),
  defect_code_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type CreateQualityEventInput = z.infer<typeof createQualityEventSchema>;

export async function createQualityEvent(input: CreateQualityEventInput) {
  const validated = createQualityEventSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quality_events")
    .insert({
      unit_id: validated.unit_id,
      workstation_id: validated.workstation_id,
      event_type: validated.event_type,
      result: validated.result,
      defect_code_id: validated.defect_code_id ?? null,
      notes: validated.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`create_quality_event failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_quality_event",
  description:
    "Log an inspection, rework, or scrap quality event for a unit at a workstation.",
  schema: createQualityEventSchema,
  execute: createQualityEvent,
});

// --- list_defect_codes ---

export const listDefectCodesSchema = z.object({
  severity: z.enum(["minor", "major", "critical"]).optional(),
});
export type ListDefectCodesInput = z.infer<typeof listDefectCodesSchema>;

export async function listDefectCodes(input: ListDefectCodesInput) {
  const validated = listDefectCodesSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("defect_codes")
    .select("*")
    .order("severity", { ascending: true })
    .order("code", { ascending: true });

  if (validated.severity) {
    query = query.eq("severity", validated.severity);
  }

  const { data, error } = await query;
  if (error) throw new Error(`list_defect_codes failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_defect_codes",
  description: "List all defect codes, optionally filtered by severity.",
  schema: listDefectCodesSchema,
  execute: listDefectCodes,
});

// --- create_defect_code ---

export const createDefectCodeSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.enum(["minor", "major", "critical"]),
});
export type CreateDefectCodeInput = z.infer<typeof createDefectCodeSchema>;

export async function createDefectCode(input: CreateDefectCodeInput) {
  const validated = createDefectCodeSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("defect_codes")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(`create_defect_code failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_defect_code",
  description:
    "Create a new defect code with severity (minor/major/critical).",
  schema: createDefectCodeSchema,
  execute: createDefectCode,
});

// --- create_test_definition ---

export const createTestDefinitionSchema = z.object({
  part_number_id: z.string().uuid(),
  route_step_id: z.string().uuid(),
  test_name: z.string(),
  property: z.string(),
  unit_of_measure: z.string(),
  lower_limit: z.number(),
  upper_limit: z.number(),
  measurement_method: z.string().optional(),
});
export type CreateTestDefinitionInput = z.infer<
  typeof createTestDefinitionSchema
>;

export async function createTestDefinition(input: CreateTestDefinitionInput) {
  const validated = createTestDefinitionSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (validated.lower_limit >= validated.upper_limit) {
    throw new Error(
      "create_test_definition: lower_limit must be less than upper_limit",
    );
  }

  const { data, error } = await supabase
    .from("quality_test_definitions")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error)
    throw new Error(`create_test_definition failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_test_definition",
  description:
    "Define a quality test for a route step (e.g., torque test: 45–55 Nm). Used to record and auto-evaluate measured values.",
  schema: createTestDefinitionSchema,
  execute: createTestDefinition,
});

// --- list_test_definitions ---

export const listTestDefinitionsSchema = z.object({
  part_number_id: z.string().uuid().optional(),
  route_step_id: z.string().uuid().optional(),
});
export type ListTestDefinitionsInput = z.infer<
  typeof listTestDefinitionsSchema
>;

export async function listTestDefinitions(input: ListTestDefinitionsInput) {
  const validated = listTestDefinitionsSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("quality_test_definitions")
    .select("*, route_steps(name, step_number, workstations(name))")
    .order("created_at", { ascending: true });

  if (validated.part_number_id) {
    query = query.eq("part_number_id", validated.part_number_id);
  }
  if (validated.route_step_id) {
    query = query.eq("route_step_id", validated.route_step_id);
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`list_test_definitions failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_test_definitions",
  description:
    "List quality test definitions, optionally filtered by part number or route step.",
  schema: listTestDefinitionsSchema,
  execute: listTestDefinitions,
});

// --- record_test_result ---

export const recordTestResultSchema = z.object({
  test_definition_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  measured_value: z.number(),
  notes: z.string().optional(),
});
export type RecordTestResultInput = z.infer<typeof recordTestResultSchema>;

export async function recordTestResult(input: RecordTestResultInput) {
  const validated = recordTestResultSchema.parse(input);
  const supabase = await createClient();

  // Get test definition
  const { data: testDef, error: testError } = await supabase
    .from("quality_test_definitions")
    .select("*")
    .eq("id", validated.test_definition_id)
    .single();

  if (testError || !testDef)
    throw new Error("record_test_result: test definition not found");

  // Get unit's current workstation
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("current_step, route_id")
    .eq("id", validated.unit_id)
    .single();

  if (unitError || !unit)
    throw new Error("record_test_result: unit not found");

  // Evaluate pass/fail
  const passed =
    validated.measured_value >= testDef.lower_limit &&
    validated.measured_value <= testDef.upper_limit;

  const result: "pass" | "fail" = passed ? "pass" : "fail";

  // Find the workstation_id from the route_step_id on the test definition
  const { data: testStep } = await supabase
    .from("route_steps")
    .select("workstation_id")
    .eq("id", testDef.route_step_id)
    .single();

  // Create quality event
  const { data: qualityEvent, error: eventError } = await supabase
    .from("quality_events")
    .insert({
      unit_id: validated.unit_id,
      workstation_id: testStep?.workstation_id,
      event_type: "inspection",
      result,
      notes: validated.notes ?? null,
    })
    .select()
    .single();

  if (eventError)
    throw new Error(`record_test_result: quality event failed: ${eventError.message}`);

  return {
    quality_event: qualityEvent,
    test_name: testDef.test_name,
    property: testDef.property,
    unit_of_measure: testDef.unit_of_measure,
    measured_value: validated.measured_value,
    lower_limit: testDef.lower_limit,
    upper_limit: testDef.upper_limit,
    result,
    deviation: passed
      ? null
      : validated.measured_value < testDef.lower_limit
        ? testDef.lower_limit - validated.measured_value
        : validated.measured_value - testDef.upper_limit,
  };
}

registerTool({
  name: "record_test_result",
  description:
    "Record a measured value against a test definition. Auto-evaluates pass/fail vs limits and creates a quality event.",
  schema: recordTestResultSchema,
  execute: recordTestResult,
});
