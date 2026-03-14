import { describe, it, expect } from "vitest";
import { isActionAllowed, getActionsForMode } from "./scope";
import type { WebMCPMode } from "./types";

describe("isActionAllowed", () => {
  it("allows build-mode actions in build mode", () => {
    expect(isActionAllowed("create_line", "build")).toBe(true);
    expect(isActionAllowed("delete_machine", "build")).toBe(true);
    expect(isActionAllowed("update_workstation", "build")).toBe(true);
  });

  it("denies build-mode actions in run mode", () => {
    expect(isActionAllowed("create_line", "run")).toBe(false);
    expect(isActionAllowed("delete_machine", "run")).toBe(false);
  });

  it("allows configure-mode actions in configure mode", () => {
    expect(isActionAllowed("create_part_number", "configure")).toBe(true);
    expect(isActionAllowed("set_bom_entry", "configure")).toBe(true);
    expect(isActionAllowed("create_route", "configure")).toBe(true);
  });

  it("denies configure-mode actions in build mode", () => {
    expect(isActionAllowed("create_part_number", "build")).toBe(false);
  });

  it("allows run-mode actions in run mode", () => {
    expect(isActionAllowed("generate_units", "run")).toBe(true);
    expect(isActionAllowed("move_unit", "run")).toBe(true);
    expect(isActionAllowed("scrap_unit", "run")).toBe(true);
    expect(isActionAllowed("create_quality_event", "run")).toBe(true);
  });

  it("allows monitor-mode actions in monitor mode", () => {
    expect(isActionAllowed("get_throughput", "monitor")).toBe(true);
    expect(isActionAllowed("get_yield_report", "monitor")).toBe(true);
    expect(isActionAllowed("get_oee", "monitor")).toBe(true);
    expect(isActionAllowed("query_mqtt_messages", "monitor")).toBe(true);
    expect(isActionAllowed("get_sensor_statistics", "monitor")).toBe(true);
  });

  it("allows settings-mode actions in settings mode", () => {
    expect(isActionAllowed("get_organization", "settings")).toBe(true);
    expect(isActionAllowed("update_organization", "settings")).toBe(true);
    expect(isActionAllowed("list_members", "settings")).toBe(true);
    expect(isActionAllowed("invite_member", "settings")).toBe(true);
    expect(isActionAllowed("list_plants", "settings")).toBe(true);
    expect(isActionAllowed("create_plant", "settings")).toBe(true);
  });

  it("denies settings actions in other modes", () => {
    expect(isActionAllowed("get_organization", "build")).toBe(false);
    expect(isActionAllowed("invite_member", "run")).toBe(false);
  });

  it("denies unknown action names", () => {
    expect(isActionAllowed("nonexistent_tool", "build")).toBe(false);
    expect(isActionAllowed("nonexistent_tool", "run")).toBe(false);
  });

  it("search_units is allowed in both run and monitor", () => {
    expect(isActionAllowed("search_units", "run")).toBe(true);
    expect(isActionAllowed("search_units", "monitor")).toBe(true);
  });

  it("returns false for invalid mode", () => {
    expect(isActionAllowed("create_line", "invalid" as WebMCPMode)).toBe(false);
  });
});

describe("getActionsForMode", () => {
  it("returns build actions", () => {
    const actions = getActionsForMode("build");

    expect(actions).toContain("list_lines");
    expect(actions).toContain("create_line");
    expect(actions).toContain("create_machine");
    expect(actions).toContain("update_machine_status");
  });

  it("returns configure actions", () => {
    const actions = getActionsForMode("configure");

    expect(actions).toContain("list_part_numbers");
    expect(actions).toContain("create_part_number");
    expect(actions).toContain("list_routes");
  });

  it("returns run actions", () => {
    const actions = getActionsForMode("run");

    expect(actions).toContain("generate_units");
    expect(actions).toContain("move_unit");
    expect(actions).toContain("create_production_order");
  });

  it("returns monitor actions", () => {
    const actions = getActionsForMode("monitor");

    expect(actions).toContain("get_throughput");
    expect(actions).toContain("get_oee");
    expect(actions).toContain("query_mqtt_messages");
  });

  it("returns settings actions", () => {
    const actions = getActionsForMode("settings");

    expect(actions).toContain("get_organization");
    expect(actions).toContain("list_members");
    expect(actions).toContain("list_plants");
  });

  it("returns empty array for unknown mode", () => {
    expect(getActionsForMode("unknown" as WebMCPMode)).toEqual([]);
  });
});
