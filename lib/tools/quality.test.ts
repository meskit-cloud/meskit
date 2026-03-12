import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});
vi.mock("@/lib/org-context", () => ({
  getOrgContext: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { dbChain } from "@/tests/mocks/supabase";
import {
  createTestDefinitionSchema,
  createTestDefinition,
  recordTestResult,
} from "./quality";

const mockCreateClient = vi.mocked(createClient);
const mockGetOrgContext = vi.mocked(getOrgContext);

const USER = { id: "user-abc" };
const ORG_CONTEXT = {
  userId: USER.id,
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};
const PART_NUMBER_ID = "11111111-1111-1111-1111-111111111111";
const ROUTE_STEP_ID = "22222222-2222-2222-2222-222222222222";
const TEST_DEF_ID = "33333333-3333-3333-3333-333333333333";
const UNIT_ID = "44444444-4444-4444-4444-444444444444";
const WORKSTATION_ID = "55555555-5555-5555-5555-555555555555";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: USER } }) },
    from: vi.fn(),
  };
  for (const chain of fromChains) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrgContext.mockResolvedValue(ORG_CONTEXT);
});

// --- createTestDefinitionSchema ---

describe("createTestDefinitionSchema", () => {
  const valid = {
    part_number_id: PART_NUMBER_ID,
    route_step_id: ROUTE_STEP_ID,
    test_name: "Torque Test",
    property: "torque",
    unit_of_measure: "Nm",
    lower_limit: 45,
    upper_limit: 55,
  };

  it("accepts a valid test definition", () => {
    expect(() => createTestDefinitionSchema.parse(valid)).not.toThrow();
  });

  it("requires lower_limit to be a number", () => {
    expect(() =>
      createTestDefinitionSchema.parse({ ...valid, lower_limit: "45" }),
    ).toThrow();
  });

  it("requires upper_limit to be a number", () => {
    expect(() =>
      createTestDefinitionSchema.parse({ ...valid, upper_limit: "55" }),
    ).toThrow();
  });

  it("requires test_name to be a string", () => {
    expect(() =>
      createTestDefinitionSchema.parse({ ...valid, test_name: 123 }),
    ).toThrow();
  });
});

// --- createTestDefinition: business rule validation ---

describe("createTestDefinition — limit validation", () => {
  it("throws when lower_limit equals upper_limit", async () => {
    makeClient([]);
    await expect(
      createTestDefinition({
        part_number_id: PART_NUMBER_ID,
        route_step_id: ROUTE_STEP_ID,
        test_name: "Torque",
        property: "torque",
        unit_of_measure: "Nm",
        lower_limit: 50,
        upper_limit: 50,
      }),
    ).rejects.toThrow("lower_limit must be less than upper_limit");
  });

  it("throws when lower_limit is greater than upper_limit", async () => {
    makeClient([]);
    await expect(
      createTestDefinition({
        part_number_id: PART_NUMBER_ID,
        route_step_id: ROUTE_STEP_ID,
        test_name: "Torque",
        property: "torque",
        unit_of_measure: "Nm",
        lower_limit: 60,
        upper_limit: 40,
      }),
    ).rejects.toThrow("lower_limit must be less than upper_limit");
  });

  it("succeeds when lower_limit is strictly less than upper_limit", async () => {
    const testDef = { id: "td-1", test_name: "Torque" };
    makeClient([dbChain({ data: testDef })]);

    const result = await createTestDefinition({
      part_number_id: PART_NUMBER_ID,
      route_step_id: ROUTE_STEP_ID,
      test_name: "Torque",
      property: "torque",
      unit_of_measure: "Nm",
      lower_limit: 45,
      upper_limit: 55,
    });

    expect(result).toEqual(testDef);
  });
});

// --- recordTestResult: pass/fail logic ---

describe("recordTestResult — pass/fail evaluation", () => {
  const TEST_DEF = {
    id: TEST_DEF_ID,
    test_name: "Torque Test",
    property: "torque",
    unit_of_measure: "Nm",
    lower_limit: 45,
    upper_limit: 55,
    route_step_id: ROUTE_STEP_ID,
  };

  const UNIT = { id: UNIT_ID, current_step: 1, route_id: "route-id" };
  const STEP = { workstation_id: WORKSTATION_ID };
  const QUALITY_EVENT = { id: "qe-1", result: "pass" };

  function setupMocks(measuredValue: number, eventResult: "pass" | "fail") {
    makeClient([
      dbChain({ data: TEST_DEF }),                           // SELECT test_definition
      dbChain({ data: UNIT }),                               // SELECT unit
      dbChain({ data: STEP }),                               // maybeSingle route_step
      dbChain({ data: STEP }),                               // SELECT testStep
      dbChain({ data: { ...QUALITY_EVENT, result: eventResult } }), // INSERT quality_event
    ]);
  }

  it("returns 'pass' when value is within limits (inclusive)", async () => {
    setupMocks(50, "pass");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 50,
    });
    expect(result.result).toBe("pass");
    expect(result.deviation).toBeNull();
  });

  it("returns 'pass' when value equals lower_limit (boundary)", async () => {
    setupMocks(45, "pass");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 45,
    });
    expect(result.result).toBe("pass");
  });

  it("returns 'pass' when value equals upper_limit (boundary)", async () => {
    setupMocks(55, "pass");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 55,
    });
    expect(result.result).toBe("pass");
  });

  it("returns 'fail' when value is below lower_limit", async () => {
    setupMocks(40, "fail");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 40,
    });
    expect(result.result).toBe("fail");
    expect(result.deviation).toBe(5);
  });

  it("returns 'fail' when value is above upper_limit", async () => {
    setupMocks(60, "fail");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 60,
    });
    expect(result.result).toBe("fail");
    expect(result.deviation).toBe(5);
  });

  it("includes test metadata in the result", async () => {
    setupMocks(50, "pass");
    const result = await recordTestResult({
      test_definition_id: TEST_DEF_ID,
      unit_id: UNIT_ID,
      measured_value: 50,
    });

    expect(result).toMatchObject({
      test_name: "Torque Test",
      property: "torque",
      unit_of_measure: "Nm",
      measured_value: 50,
      lower_limit: 45,
      upper_limit: 55,
    });
  });

  it("throws when test definition is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }),
    ]);
    await expect(
      recordTestResult({ test_definition_id: TEST_DEF_ID, unit_id: UNIT_ID, measured_value: 50 }),
    ).rejects.toThrow("test definition not found");
  });

  it("throws when unit is not found", async () => {
    makeClient([
      dbChain({ data: TEST_DEF }),
      dbChain({ data: null, error: { message: "not found" } }),
    ]);
    await expect(
      recordTestResult({ test_definition_id: TEST_DEF_ID, unit_id: UNIT_ID, measured_value: 50 }),
    ).rejects.toThrow("unit not found");
  });
});
