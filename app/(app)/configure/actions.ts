"use server";

import {
  listPartNumbers,
  createPartNumber,
  updatePartNumber,
  deletePartNumber,
  listItems,
  createItem,
  getBom,
  setBomEntry,
  deleteBomEntry,
  listRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  configureSerialAlgorithm,
  getSerialAlgorithm,
} from "@/lib/tools/product";
import { listWorkstations } from "@/lib/tools/shop-floor";
import { writeAuditLog } from "@/lib/audit";

// --- Part Numbers ---

export async function fetchPartNumbers() {
  return listPartNumbers({});
}

export async function addPartNumber(name: string, description?: string) {
  const result = await createPartNumber({ name, description });
  writeAuditLog({ action: "create_part_number", entity_type: "part_number", entity_id: (result as { id: string }).id, metadata: { name, description } });
  return result;
}

export async function editPartNumber(id: string, name?: string, description?: string) {
  const result = await updatePartNumber({ id, name, description });
  writeAuditLog({ action: "update_part_number", entity_type: "part_number", entity_id: id, metadata: { name, description } });
  return result;
}

export async function removePartNumber(id: string) {
  const result = await deletePartNumber({ id });
  writeAuditLog({ action: "delete_part_number", entity_type: "part_number", entity_id: id });
  return result;
}

// --- Items ---

export async function fetchItems() {
  return listItems({});
}

export async function addItem(name: string, description?: string) {
  const result = await createItem({ name, description });
  writeAuditLog({ action: "create_item", entity_type: "item", entity_id: (result as { id: string }).id, metadata: { name, description } });
  return result;
}

// --- BOM ---

export async function fetchBom(partNumberId: string) {
  return getBom({ part_number_id: partNumberId });
}

export async function addBomEntry(
  partNumberId: string,
  itemId: string,
  quantity: number,
  position: number,
) {
  const result = await setBomEntry({ part_number_id: partNumberId, item_id: itemId, quantity, position });
  writeAuditLog({ action: "set_bom_entry", entity_type: "bom_entry", entity_id: (result as { id: string }).id, metadata: { part_number_id: partNumberId, item_id: itemId, quantity, position } });
  return result;
}

export async function removeBomEntry(id: string) {
  const result = await deleteBomEntry({ id });
  writeAuditLog({ action: "delete_bom_entry", entity_type: "bom_entry", entity_id: id });
  return result;
}

// --- Routes ---

export async function fetchRoutes(partNumberId: string) {
  return listRoutes({ part_number_id: partNumberId });
}

export async function addRoute(
  partNumberId: string,
  name: string,
  steps: { workstation_id: string; step_number: number; name: string; pass_fail_gate?: boolean }[],
) {
  const result = await createRoute({ part_number_id: partNumberId, name, steps });
  writeAuditLog({ action: "create_route", entity_type: "route", entity_id: (result as { id: string }).id, metadata: { part_number_id: partNumberId, name, step_count: steps.length } });
  return result;
}

export async function editRoute(
  id: string,
  name?: string,
  steps?: { workstation_id: string; step_number: number; name: string; pass_fail_gate?: boolean }[],
) {
  const result = await updateRoute({ id, name, steps });
  writeAuditLog({ action: "update_route", entity_type: "route", entity_id: id, metadata: { name, step_count: steps?.length } });
  return result;
}

export async function removeRoute(id: string) {
  const result = await deleteRoute({ id });
  writeAuditLog({ action: "delete_route", entity_type: "route", entity_id: id });
  return result;
}

// --- Serial Algorithm ---

export async function fetchSerialAlgorithm(partNumberId: string) {
  return getSerialAlgorithm({ part_number_id: partNumberId });
}

export async function setSerialAlgorithm(
  partNumberId: string,
  prefix: string,
  padLength: number,
) {
  const result = await configureSerialAlgorithm({ part_number_id: partNumberId, prefix, pad_length: padLength });
  writeAuditLog({ action: "configure_serial_algorithm", entity_type: "serial_algorithm", entity_id: (result as { id: string }).id, metadata: { part_number_id: partNumberId, prefix, pad_length: padLength } });
  return result;
}

// --- Workstations (for route step assignment) ---

export async function fetchAllWorkstations() {
  return listWorkstations({});
}
