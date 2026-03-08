"use server";

import {
  listLines,
  createLine,
  updateLine,
  deleteLine,
  listWorkstations,
  createWorkstation,
  updateWorkstation,
  deleteWorkstation,
  listMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  updateMachineStatus,
} from "@/lib/tools/shop-floor";
import { writeAuditLog } from "@/lib/audit";

// --- Lines ---

export async function fetchLines() {
  return listLines({});
}

export async function addLine(name: string, description?: string) {
  const result = await createLine({ name, description });
  writeAuditLog({ action: "create_line", entity_type: "line", entity_id: (result as { id: string }).id, metadata: { name, description } });
  return result;
}

export async function editLine(id: string, name?: string, description?: string) {
  const result = await updateLine({ id, name, description });
  writeAuditLog({ action: "update_line", entity_type: "line", entity_id: id, metadata: { name, description } });
  return result;
}

export async function removeLine(id: string) {
  const result = await deleteLine({ id });
  writeAuditLog({ action: "delete_line", entity_type: "line", entity_id: id });
  return result;
}

// --- Workstations ---

export async function fetchWorkstations(lineId: string) {
  return listWorkstations({ line_id: lineId });
}

export async function addWorkstation(
  lineId: string,
  name: string,
  position: number,
  operatorName?: string,
) {
  const result = await createWorkstation({ line_id: lineId, name, position, operator_name: operatorName });
  writeAuditLog({ action: "create_workstation", entity_type: "workstation", entity_id: (result as { id: string }).id, metadata: { line_id: lineId, name, position } });
  return result;
}

export async function editWorkstation(
  id: string,
  updates: { name?: string; position?: number; operator_name?: string | null },
) {
  const result = await updateWorkstation({ id, ...updates });
  writeAuditLog({ action: "update_workstation", entity_type: "workstation", entity_id: id, metadata: updates });
  return result;
}

export async function reorderWorkstations(
  orderedIds: string[],
) {
  await Promise.all(
    orderedIds.map((id, i) => updateWorkstation({ id, position: i + 1 })),
  );
  writeAuditLog({ action: "reorder_workstation", entity_type: "workstation", metadata: { order: orderedIds } });
}

export async function removeWorkstation(id: string) {
  const result = await deleteWorkstation({ id });
  writeAuditLog({ action: "delete_workstation", entity_type: "workstation", entity_id: id });
  return result;
}

// --- Machines ---

export async function fetchMachines(workstationId: string) {
  return listMachines({ workstation_id: workstationId });
}

export async function addMachine(
  workstationId: string,
  name: string,
  type: string,
) {
  const result = await createMachine({ workstation_id: workstationId, name, type });
  writeAuditLog({ action: "create_machine", entity_type: "machine", entity_id: (result as { id: string }).id, metadata: { workstation_id: workstationId, name, type } });
  return result;
}

export async function editMachine(
  id: string,
  updates: { name?: string; type?: string },
) {
  const result = await updateMachine({ id, ...updates });
  writeAuditLog({ action: "update_machine", entity_type: "machine", entity_id: id, metadata: updates });
  return result;
}

export async function removeMachine(id: string) {
  const result = await deleteMachine({ id });
  writeAuditLog({ action: "delete_machine", entity_type: "machine", entity_id: id });
  return result;
}

export async function changeMachineStatus(
  id: string,
  status: "STOPPED" | "IDLE" | "EXECUTE" | "HELD" | "SUSPENDED" | "COMPLETE" | "ABORTED",
) {
  const result = await updateMachineStatus({ id, status });
  writeAuditLog({ action: "update_machine_status", entity_type: "machine", entity_id: id, metadata: { status } });
  return result;
}
