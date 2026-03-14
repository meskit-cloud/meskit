import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/tools/registry", () => ({
  getAllTools: vi.fn(),
}));

import { z } from "zod";
import { getAllTools } from "@/lib/tools/registry";
import { buildCatalog, getActionsForPage } from "./catalog";

const mockGetAllTools = vi.mocked(getAllTools);

function makeTool(name: string, description = "desc") {
  return {
    name,
    description,
    schema: z.object({}),
    execute: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildCatalog", () => {
  it("includes tools that are mapped to a mode", () => {
    mockGetAllTools.mockReturnValue([
      makeTool("list_lines"),
      makeTool("create_line"),
    ]);

    const catalog = buildCatalog();

    expect(catalog.version).toBe("1.0.0");
    expect(catalog.actions).toHaveLength(2);
    expect(catalog.actions[0].name).toBe("list_lines");
    expect(catalog.actions[0].mode).toBe("build");
  });

  it("excludes tools not mapped to any mode", () => {
    mockGetAllTools.mockReturnValue([
      makeTool("list_lines"),
      makeTool("unmapped_tool"),
    ]);

    const catalog = buildCatalog();

    expect(catalog.actions).toHaveLength(1);
    expect(catalog.actions.find((a) => a.name === "unmapped_tool")).toBeUndefined();
  });

  it("marks destructive actions", () => {
    mockGetAllTools.mockReturnValue([
      makeTool("delete_line"),
      makeTool("list_lines"),
      makeTool("scrap_unit"),
      makeTool("remove_member"),
    ]);

    const catalog = buildCatalog();

    const deleteLine = catalog.actions.find((a) => a.name === "delete_line");
    const listLines = catalog.actions.find((a) => a.name === "list_lines");
    const scrapUnit = catalog.actions.find((a) => a.name === "scrap_unit");
    const removeMember = catalog.actions.find((a) => a.name === "remove_member");

    expect(deleteLine?.destructive).toBe(true);
    expect(listLines?.destructive).toBe(false);
    expect(scrapUnit?.destructive).toBe(true);
    expect(removeMember?.destructive).toBe(true);
  });

  it("marks any delete_* tool as destructive via prefix", () => {
    mockGetAllTools.mockReturnValue([
      makeTool("delete_workstation"),
      makeTool("delete_part_number"),
      makeTool("delete_bom_entry"),
    ]);

    const catalog = buildCatalog();

    for (const action of catalog.actions) {
      expect(action.destructive).toBe(true);
    }
  });

  it("assigns correct mode to each tool", () => {
    mockGetAllTools.mockReturnValue([
      makeTool("list_lines"),           // build
      makeTool("create_part_number"),   // configure
      makeTool("generate_units"),        // run
      makeTool("get_throughput"),         // monitor
      makeTool("get_organization"),      // settings
    ]);

    const catalog = buildCatalog();
    const byName = new Map(catalog.actions.map((a) => [a.name, a]));

    expect(byName.get("list_lines")?.mode).toBe("build");
    expect(byName.get("create_part_number")?.mode).toBe("configure");
    expect(byName.get("generate_units")?.mode).toBe("run");
    expect(byName.get("get_throughput")?.mode).toBe("monitor");
    expect(byName.get("get_organization")?.mode).toBe("settings");
  });

  it("includes parameters from tool schema", () => {
    mockGetAllTools.mockReturnValue([
      {
        name: "create_line",
        description: "Create a line",
        schema: z.object({ name: z.string() }),
        execute: vi.fn(),
      },
    ]);

    const catalog = buildCatalog();

    expect(catalog.actions[0].parameters).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    });
  });

  it("returns empty actions for empty registry", () => {
    mockGetAllTools.mockReturnValue([]);

    const catalog = buildCatalog();

    expect(catalog.actions).toEqual([]);
  });
});

describe("getActionsForPage", () => {
  beforeEach(() => {
    mockGetAllTools.mockReturnValue([
      makeTool("list_lines"),           // build
      makeTool("create_line"),          // build
      makeTool("create_part_number"),   // configure
      makeTool("generate_units"),        // run
      makeTool("get_throughput"),         // monitor
      makeTool("get_organization"),      // settings
    ]);
  });

  it("returns only build actions for build page", () => {
    const actions = getActionsForPage("build");

    expect(actions.every((a) => a.mode === "build")).toBe(true);
    expect(actions).toHaveLength(2);
  });

  it("returns only configure actions for configure page", () => {
    const actions = getActionsForPage("configure");

    expect(actions.every((a) => a.mode === "configure")).toBe(true);
  });

  it("returns only run actions for run page", () => {
    const actions = getActionsForPage("run");

    expect(actions.every((a) => a.mode === "run")).toBe(true);
  });

  it("returns only monitor actions for monitor page", () => {
    const actions = getActionsForPage("monitor");

    expect(actions.every((a) => a.mode === "monitor")).toBe(true);
  });

  it("returns only settings actions for settings page", () => {
    const actions = getActionsForPage("settings");

    expect(actions.every((a) => a.mode === "settings")).toBe(true);
  });
});
