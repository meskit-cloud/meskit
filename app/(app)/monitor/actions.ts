"use server";

import { getThroughput } from "@/lib/tools/analytics";
import { getYieldReport } from "@/lib/tools/analytics";
import { getUnitHistory } from "@/lib/tools/analytics";
import { getOee } from "@/lib/tools/analytics";
import { getOrderSummary } from "@/lib/tools/analytics";
import { getCapabilitySnapshot } from "@/lib/tools/analytics";
import { getWipStatus } from "@/lib/tools/production";
import { listProductionOrders } from "@/lib/tools/production";
import { searchUnits } from "@/lib/tools/production";

// --- Throughput ---

export async function fetchThroughput(
  timeRange: "today" | "last_8_hours" | "last_24_hours" | "last_7_days" | "last_30_days",
  lineId?: string,
) {
  return getThroughput({ time_range: timeRange, line_id: lineId });
}

// --- Yield ---

export async function fetchYield(
  timeRange?: "today" | "last_8_hours" | "last_24_hours" | "last_7_days" | "last_30_days",
  workstationId?: string,
) {
  return getYieldReport({ time_range: timeRange, workstation_id: workstationId });
}

// --- OEE ---

export async function fetchOee(
  timeRange?: "today" | "last_8_hours" | "last_24_hours" | "last_7_days" | "last_30_days",
  lineId?: string,
) {
  return getOee({ time_range: timeRange, line_id: lineId });
}

// --- Unit History ---

export async function fetchUnitHistory(unitId: string) {
  return getUnitHistory({ unit_id: unitId });
}

// --- Search unit by serial ---

export async function findUnitBySerial(serial: string) {
  const units = await searchUnits({ serial_number: serial });
  if (!units || (units as unknown[]).length === 0) return null;
  const unit = (units as { id: string }[])[0];
  return getUnitHistory({ unit_id: unit.id });
}

// --- Orders ---

export async function fetchOrders() {
  return listProductionOrders({});
}

export async function fetchOrderSummary(orderId?: string) {
  return getOrderSummary({ production_order_id: orderId });
}

// --- WIP ---

export async function fetchWip() {
  return getWipStatus({});
}

// --- Capability ---

export async function fetchCapability(lineId?: string) {
  return getCapabilitySnapshot({ line_id: lineId });
}
