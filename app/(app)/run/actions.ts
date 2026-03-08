"use server";

import {
  listProductionOrders,
  createProductionOrder,
  updateOrderStatus,
  generateUnits,
  moveUnit,
  scrapUnit,
  searchUnits,
  getWipStatus,
} from "@/lib/tools/production";
import {
  createQualityEvent,
  listDefectCodes,
  createDefectCode,
} from "@/lib/tools/quality";
import { listPartNumbers } from "@/lib/tools/product";
import { listRoutes } from "@/lib/tools/product";
import { writeAuditLog } from "@/lib/audit";

// --- Production Orders ---

export async function fetchOrders(status?: "new" | "scheduled" | "running" | "complete" | "closed") {
  return listProductionOrders({ status });
}

export async function addOrder(
  partNumberId: string,
  routeId: string,
  quantityOrdered: number,
) {
  const result = await createProductionOrder({
    part_number_id: partNumberId,
    route_id: routeId,
    quantity_ordered: quantityOrdered,
  });
  writeAuditLog({
    action: "create_production_order",
    entity_type: "production_order",
    entity_id: (result as { id: string }).id,
    metadata: { part_number_id: partNumberId, quantity_ordered: quantityOrdered },
  });
  return result;
}

export async function changeOrderStatus(
  id: string,
  status: "new" | "scheduled" | "running" | "complete" | "closed",
) {
  const result = await updateOrderStatus({ id, status });
  writeAuditLog({
    action: "update_order_status",
    entity_type: "production_order",
    entity_id: id,
    metadata: { status },
  });
  return result;
}

// --- Units ---

export async function fetchUnitsForOrder(orderId: string) {
  return searchUnits({ production_order_id: orderId });
}

export async function spawnUnits(
  productionOrderId: string,
  partNumberId: string,
  routeId: string,
  count: number,
) {
  const result = await generateUnits({
    part_number_id: partNumberId,
    route_id: routeId,
    count,
    production_order_id: productionOrderId,
  });
  writeAuditLog({
    action: "generate_units",
    entity_type: "unit",
    metadata: { production_order_id: productionOrderId, count },
  });
  return result;
}

export async function advanceUnit(unitId: string) {
  const result = await moveUnit({ unit_id: unitId });
  writeAuditLog({
    action: "move_unit",
    entity_type: "unit",
    entity_id: unitId,
  });
  return result;
}

export async function passUnit(unitId: string, workstationId: string) {
  await createQualityEvent({
    unit_id: unitId,
    workstation_id: workstationId,
    event_type: "inspection",
    result: "pass",
  });
  const result = await moveUnit({ unit_id: unitId });
  writeAuditLog({
    action: "pass_unit",
    entity_type: "unit",
    entity_id: unitId,
    metadata: { workstation_id: workstationId },
  });
  return result;
}

export async function failUnit(
  unitId: string,
  workstationId: string,
  defectCodeId?: string,
  notes?: string,
) {
  const result = await createQualityEvent({
    unit_id: unitId,
    workstation_id: workstationId,
    event_type: "inspection",
    result: "fail",
    defect_code_id: defectCodeId,
    notes,
  });
  writeAuditLog({
    action: "fail_unit",
    entity_type: "unit",
    entity_id: unitId,
    metadata: { workstation_id: workstationId, defect_code_id: defectCodeId },
  });
  return result;
}

export async function scrapSelectedUnit(
  unitId: string,
  defectCodeId?: string,
  notes?: string,
) {
  const result = await scrapUnit({
    unit_id: unitId,
    defect_code_id: defectCodeId,
    notes,
  });
  writeAuditLog({
    action: "scrap_unit",
    entity_type: "unit",
    entity_id: unitId,
    metadata: { defect_code_id: defectCodeId, notes },
  });
  return result;
}

// --- WIP ---

export async function fetchWip() {
  return getWipStatus({});
}

// --- Defect Codes ---

export async function fetchDefectCodes() {
  return listDefectCodes({});
}

export async function addDefectCode(
  code: string,
  description: string,
  severity: "minor" | "major" | "critical",
) {
  const result = await createDefectCode({ code, description, severity });
  writeAuditLog({
    action: "create_defect_code",
    entity_type: "defect_code",
    entity_id: (result as { id: string }).id,
    metadata: { code, severity },
  });
  return result;
}

// --- For create order form ---

export async function fetchAllPartNumbers() {
  return listPartNumbers({});
}

export async function fetchRoutesByPartNumber(partNumberId: string) {
  return listRoutes({ part_number_id: partNumberId });
}

// --- Route steps (to know step names and gate flags) ---

export async function fetchRouteSteps(routeId: string) {
  const routes = await listRoutes({});
  const route = (routes as { id: string; route_steps: unknown[] }[]).find(
    (r) => r.id === routeId,
  );
  return (route?.route_steps ?? []) as {
    id: string;
    step_number: number;
    name: string;
    pass_fail_gate: boolean;
    workstation_id: string;
    workstations: { name: string } | null;
  }[];
}
