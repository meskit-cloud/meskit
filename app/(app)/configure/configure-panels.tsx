"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Package,
  ChevronRight,
  Box,
  Route as RouteIcon,
  Hash,
  Shield,
  ShieldOff,
  ChevronUp,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  fetchPartNumbers,
  addPartNumber,
  editPartNumber,
  removePartNumber,
  fetchItems,
  addItem,
  fetchBom,
  addBomEntry,
  removeBomEntry,
  fetchRoutes,
  addRoute,
  editRoute,
  removeRoute,
  fetchSerialAlgorithm,
  setSerialAlgorithm,
  fetchAllWorkstations,
} from "./actions";

// --- Types ---

interface PartNumber {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
}

interface BomEntry {
  id: string;
  part_number_id: string;
  item_id: string;
  quantity: number;
  position: number;
  items: { name: string; description: string | null } | null;
}

interface RouteStep {
  id: string;
  route_id: string;
  workstation_id: string;
  step_number: number;
  name: string;
  pass_fail_gate: boolean;
  ideal_cycle_time_seconds: number | null;
  workstations: { name: string } | null;
}

interface MfgRoute {
  id: string;
  part_number_id: string;
  name: string;
  version: number;
  created_at: string;
  route_steps: RouteStep[];
}

interface SerialAlgorithm {
  id: string;
  part_number_id: string;
  prefix: string;
  pad_length: number;
  current_counter: number;
}

interface Workstation {
  id: string;
  name: string;
  line_id: string;
}

// --- Main Component ---

export function ConfigurePanels() {
  const { selectedPartNumberId, selectPartNumber, selectRoute } = useUiStore();

  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([]);
  const [partNumbersLoaded, setPartNumbersLoaded] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [bomEntries, setBomEntries] = useState<BomEntry[]>([]);
  const [routes, setRoutes] = useState<MfgRoute[]>([]);
  const [serial, setSerial] = useState<SerialAlgorithm | null>(null);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  // Set active mode and clear Build mode selections
  useEffect(() => {
    const store = useUiStore.getState();
    store.setActiveMode("configure");
    store.selectLine(null);
  }, []);

  // Load part numbers + items + workstations on mount
  const loadPartNumbers = useCallback(async () => {
    const data = await fetchPartNumbers();
    setPartNumbers(data as PartNumber[]);
    setPartNumbersLoaded(true);
  }, []);

  const loadItems = useCallback(async () => {
    const data = await fetchItems();
    setItems(data as Item[]);
  }, []);

  const loadWorkstations = useCallback(async () => {
    const data = await fetchAllWorkstations();
    setWorkstations(data as Workstation[]);
  }, []);

  useEffect(() => {
    loadPartNumbers();
    loadItems();
    loadWorkstations();
  }, [loadPartNumbers, loadItems, loadWorkstations]);

  // Load BOM, routes, serial when part number changes
  const loadDetail = useCallback(async () => {
    if (!selectedPartNumberId) {
      setBomEntries([]);
      setRoutes([]);
      setSerial(null);
      return;
    }
    const [bomData, routeData, serialData] = await Promise.all([
      fetchBom(selectedPartNumberId),
      fetchRoutes(selectedPartNumberId),
      fetchSerialAlgorithm(selectedPartNumberId),
    ]);
    setBomEntries(bomData as BomEntry[]);
    setRoutes(routeData as MfgRoute[]);
    setSerial(serialData as SerialAlgorithm | null);
  }, [selectedPartNumberId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Clear route selection when part number changes
  useEffect(() => {
    selectRoute(null);
  }, [selectedPartNumberId, selectRoute]);

  // Debounced detail loader for Realtime (avoids rapid re-fetches)
  const detailTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedLoadDetail = useCallback(() => {
    clearTimeout(detailTimerRef.current);
    detailTimerRef.current = setTimeout(() => loadDetail(), 300);
  }, [loadDetail]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("configure-mode")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "part_numbers" },
        () => loadPartNumbers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => loadItems(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bom_entries" },
        () => {
          if (selectedPartNumberId) debouncedLoadDetail();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        () => {
          if (selectedPartNumberId) debouncedLoadDetail();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_steps" },
        () => {
          if (selectedPartNumberId) debouncedLoadDetail();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "serial_algorithms" },
        () => {
          if (selectedPartNumberId) debouncedLoadDetail();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(detailTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedPartNumberId, loadPartNumbers, loadItems, debouncedLoadDetail]);

  const selectedPN = partNumbers.find((p) => p.id === selectedPartNumberId) ?? null;

  return (
    <div className="flex h-full gap-px bg-border">
      <PartNumbersPanel
        partNumbers={partNumbers}
        isLoaded={partNumbersLoaded}
        selectedId={selectedPartNumberId}
        onSelect={(pn) => selectPartNumber(pn.id, pn.name)}
        onReload={loadPartNumbers}
      />
      <DetailPanel
        partNumber={selectedPN}
        bomEntries={bomEntries}
        serial={serial}
        items={items}
        onReloadBom={loadDetail}
        onReloadItems={loadItems}
        onReloadSerial={loadDetail}
      />
      <RoutesPanel
        partNumber={selectedPN}
        routes={routes}
        workstations={workstations}
        onReload={loadDetail}
      />
    </div>
  );
}

// --- Part Numbers Panel ---

function PartNumbersPanel({
  partNumbers,
  isLoaded,
  selectedId,
  onSelect,
  onReload,
}: {
  partNumbers: PartNumber[];
  isLoaded: boolean;
  selectedId: string | null;
  onSelect: (pn: PartNumber) => void;
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addPartNumber(newName.trim(), newDesc.trim() || undefined);
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
      onReload();
    });
  }

  function handleEdit(pn: PartNumber) {
    if (!editName.trim() || editName.trim() === pn.name) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await editPartNumber(pn.id, editName.trim());
      setEditingId(null);
      onReload();
    });
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      await removePartNumber(id);
      setDeletingId(null);
      if (selectedId === id) {
        useUiStore.getState().selectPartNumber(null);
      }
      onReload();
    });
  }

  return (
    <div className="w-64 bg-bg-surface flex flex-col shrink-0">
      <PanelHeader
        title="Part Numbers"
        onAdd={() => {
          setShowAdd(true);
          setNewName("");
          setNewDesc("");
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {showAdd && (
          <div className="px-3 py-2 border-b border-border space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Part number name..."
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Description (optional)..."
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <div className="flex gap-1">
              <button
                onClick={handleAdd}
                disabled={pending || !newName.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <Check size={12} /> Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {isLoaded && partNumbers.length === 0 && !showAdd && (
          <EmptyState
            icon={<Package size={28} />}
            message="No part numbers"
            hint='Click "+" to define your first product'
          />
        )}

        {partNumbers.map((pn) => (
          <div
            key={pn.id}
            onClick={() => onSelect(pn)}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border transition-colors ${
              selectedId === pn.id
                ? "bg-accent/10 border-l-2 border-l-accent"
                : "hover:bg-bg-app border-l-2 border-l-transparent"
            }`}
          >
            {editingId === pn.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit(pn);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => handleEdit(pn)}
                className="flex-1 px-1.5 py-0.5 text-sm rounded border border-accent bg-bg-app text-text-primary focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                disabled={pending}
              />
            ) : (
              <>
                <Package size={16} className="text-text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">{pn.name}</div>
                  {pn.description && (
                    <div className="text-xs text-text-secondary/60 truncate mt-0.5">
                      {pn.description}
                    </div>
                  )}
                </div>
                {deletingId === pn.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-error">Delete?</span>
                    <button
                      onClick={() => confirmDelete(pn.id)}
                      disabled={pending}
                      className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="p-1 rounded text-text-secondary hover:bg-bg-app"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(pn.id);
                        setEditName(pn.name);
                      }}
                      className="p-1 rounded hover:bg-bg-surface text-text-secondary"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(pn.id);
                      }}
                      className="p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                {selectedId === pn.id && deletingId !== pn.id && (
                  <ChevronRight size={14} className="text-accent shrink-0" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Detail Panel (BOM + Serial) ---

function DetailPanel({
  partNumber,
  bomEntries,
  serial,
  items,
  onReloadBom,
  onReloadItems,
  onReloadSerial,
}: {
  partNumber: PartNumber | null;
  bomEntries: BomEntry[];
  serial: SerialAlgorithm | null;
  items: Item[];
  onReloadBom: () => void;
  onReloadItems: () => void;
  onReloadSerial: () => void;
}) {
  if (!partNumber) {
    return (
      <div className="flex-1 bg-bg-surface flex flex-col">
        <PanelHeader title="Product Detail" />
        <EmptyState
          icon={<Layers size={28} />}
          message="Select a part number"
          hint="Choose a product from the left panel to view its BOM and serial config"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-surface flex flex-col min-w-0">
      <PanelHeader title={`Detail — ${partNumber.name}`} />
      <div className="flex-1 overflow-y-auto">
        <BomSection
          partNumber={partNumber}
          bomEntries={bomEntries}
          items={items}
          onReloadBom={onReloadBom}
          onReloadItems={onReloadItems}
        />
        <SerialSection
          partNumber={partNumber}
          serial={serial}
          onReload={onReloadSerial}
        />
      </div>
    </div>
  );
}

// --- BOM Section ---

function BomSection({
  partNumber,
  bomEntries,
  items,
  onReloadBom,
  onReloadItems,
}: {
  partNumber: PartNumber;
  bomEntries: BomEntry[];
  items: Item[];
  onReloadBom: () => void;
  onReloadItems: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Items not already in BOM
  const availableItems = items.filter(
    (item) => !bomEntries.some((be) => be.item_id === item.id),
  );

  function handleAddEntry() {
    if (!selectedItemId || !quantity) return;
    const nextPosition = bomEntries.length + 1;
    startTransition(async () => {
      await addBomEntry(partNumber.id, selectedItemId, parseInt(quantity), nextPosition);
      setSelectedItemId("");
      setQuantity("1");
      setShowAdd(false);
      onReloadBom();
    });
  }

  function handleCreateItem() {
    if (!newItemName.trim()) return;
    startTransition(async () => {
      await addItem(newItemName.trim());
      setNewItemName("");
      setShowNewItem(false);
      onReloadItems();
    });
  }

  function confirmDeleteEntry(id: string) {
    startTransition(async () => {
      await removeBomEntry(id);
      setDeletingId(null);
      onReloadBom();
    });
  }

  return (
    <div className="border-b border-border">
      <div className="px-3 py-2 flex items-center justify-between bg-bg-app/50">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Bill of Materials
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="w-5 h-5 rounded flex items-center justify-center text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {showAdd && (
        <div className="px-3 py-2 border-b border-border space-y-1.5">
          {availableItems.length > 0 ? (
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary focus:outline-none"
              disabled={pending}
            >
              <option value="">Select an item...</option>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-text-secondary">
              No items available.{" "}
              <button
                onClick={() => setShowNewItem(true)}
                className="text-accent hover:underline"
              >
                Create one
              </button>
            </p>
          )}
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary focus:outline-none"
            disabled={pending}
          />
          <div className="flex gap-1">
            <button
              onClick={handleAddEntry}
              disabled={pending || !selectedItemId}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Check size={12} /> Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setSelectedItemId("");
                setQuantity("1");
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
            >
              <X size={12} /> Cancel
            </button>
            {availableItems.length > 0 && (
              <button
                onClick={() => setShowNewItem(true)}
                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded text-accent hover:bg-accent/10"
              >
                <Plus size={12} /> New Item
              </button>
            )}
          </div>
        </div>
      )}

      {showNewItem && (
        <div className="px-3 py-2 border-b border-border bg-accent/5 space-y-1.5">
          <input
            autoFocus
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateItem();
              if (e.key === "Escape") setShowNewItem(false);
            }}
            placeholder="New item name..."
            className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            disabled={pending}
          />
          <div className="flex gap-1">
            <button
              onClick={handleCreateItem}
              disabled={pending || !newItemName.trim()}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Check size={12} /> Create
            </button>
            <button
              onClick={() => setShowNewItem(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {bomEntries.length === 0 && !showAdd && (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-text-secondary/60">
            No items in BOM. Click + to add components.
          </p>
        </div>
      )}

      {bomEntries.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-center gap-2 px-3 py-2 border-b border-border"
        >
          <Box size={14} className="text-text-secondary shrink-0" />
          <span className="flex-1 text-sm text-text-primary truncate">
            {entry.items?.name ?? "Unknown item"}
          </span>
          <span className="text-xs text-text-secondary font-mono">
            x{entry.quantity}
          </span>
          {deletingId === entry.id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => confirmDeleteEntry(entry.id)}
                disabled={pending}
                className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="p-1 rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeletingId(entry.id)}
              className="hidden group-hover:block p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Serial Section ---

function SerialSection({
  partNumber,
  serial,
  onReload,
}: {
  partNumber: PartNumber;
  serial: SerialAlgorithm | null;
  onReload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [padLength, setPadLength] = useState("5");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (serial) {
      setPrefix(serial.prefix);
      setPadLength(String(serial.pad_length));
    } else {
      setPrefix("");
      setPadLength("5");
    }
  }, [serial]);

  function handleSave() {
    if (!prefix.trim()) return;
    startTransition(async () => {
      await setSerialAlgorithm(partNumber.id, prefix.trim(), parseInt(padLength));
      setEditing(false);
      onReload();
    });
  }

  const previewSerial = prefix.trim()
    ? `${prefix.trim()}-${"0".repeat(Math.max(0, parseInt(padLength) - 1))}1`
    : "—";

  return (
    <div className="border-b border-border">
      <div className="px-3 py-2 flex items-center justify-between bg-bg-app/50">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Serial Algorithm
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="w-5 h-5 rounded flex items-center justify-center text-accent hover:bg-accent/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-secondary">Prefix</label>
              <input
                autoFocus
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="e.g. SMX"
                className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
                disabled={pending}
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-text-secondary">Digits</label>
              <input
                type="number"
                min="1"
                max="10"
                value={padLength}
                onChange={(e) => setPadLength(e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary focus:outline-none"
                disabled={pending}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={12} className="text-text-secondary" />
            <span className="text-xs text-text-secondary">Preview:</span>
            <span className="text-sm font-mono text-accent">{previewSerial}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={pending || !prefix.trim()}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : serial ? (
        <div className="px-3 py-3 flex items-center gap-3">
          <Hash size={14} className="text-text-secondary" />
          <div>
            <div className="text-sm font-mono text-text-primary">
              {serial.prefix}-{"0".repeat(Math.max(0, serial.pad_length - 1))}1
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              Prefix: {serial.prefix} · Digits: {serial.pad_length} · Counter: {serial.current_counter}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-text-secondary/60">
            No serial algorithm configured. Click the pencil to set one up.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Routes Panel ---

function RoutesPanel({
  partNumber,
  routes,
  workstations,
  onReload,
}: {
  partNumber: PartNumber | null;
  routes: MfgRoute[];
  workstations: Workstation[];
  onReload: () => void;
}) {
  const { selectedRouteId, selectRoute } = useUiStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  function handleAddRoute() {
    if (!newRouteName.trim() || !partNumber) return;
    startTransition(async () => {
      await addRoute(partNumber.id, newRouteName.trim(), []);
      setNewRouteName("");
      setShowAdd(false);
      onReload();
    });
  }

  function confirmDeleteRoute(id: string) {
    startTransition(async () => {
      await removeRoute(id);
      setDeletingId(null);
      if (selectedRouteId === id) selectRoute(null);
      onReload();
    });
  }

  if (!partNumber) {
    return (
      <div className="w-80 bg-bg-surface flex flex-col shrink-0">
        <PanelHeader title="Routes" />
        <EmptyState
          icon={<RouteIcon size={28} />}
          message="Select a part number"
          hint="Choose a product to design its manufacturing routes"
        />
      </div>
    );
  }

  return (
    <div className="w-80 bg-bg-surface flex flex-col shrink-0">
      <PanelHeader
        title={`Routes — ${partNumber.name}`}
        onAdd={() => {
          setShowAdd(true);
          setNewRouteName("");
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {showAdd && (
          <div className="px-3 py-2 border-b border-border">
            <input
              autoFocus
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRoute();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Route name..."
              className="w-full px-2 py-1.5 text-sm rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              disabled={pending}
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={handleAddRoute}
                disabled={pending || !newRouteName.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <Check size={12} /> Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}

        {routes.length === 0 && !showAdd && (
          <EmptyState
            icon={<RouteIcon size={28} />}
            message="No routes"
            hint='Click "+" to create a manufacturing route'
          />
        )}

        {/* Route list */}
        {routes.map((route) => (
          <div key={route.id}>
            <div
              onClick={() =>
                selectRoute(
                  selectedRouteId === route.id ? null : route.id,
                  route.name,
                )
              }
              className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-border transition-colors ${
                selectedRouteId === route.id
                  ? "bg-accent/10"
                  : "hover:bg-bg-app"
              }`}
            >
              <RouteIcon size={14} className="text-text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {route.name}
                  {route.version > 1 && (
                    <span className="ml-1.5 text-[10px] font-mono text-text-secondary/50">v{route.version}</span>
                  )}
                </div>
                <div className="text-xs text-text-secondary/60 mt-0.5">
                  {route.route_steps.length} step{route.route_steps.length !== 1 ? "s" : ""}
                </div>
              </div>
              {deletingId === route.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-error">Delete?</span>
                  <button
                    onClick={() => confirmDeleteRoute(route.id)}
                    disabled={pending}
                    className="p-1 rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-50"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="p-1 rounded text-text-secondary hover:bg-bg-app"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(route.id);
                  }}
                  className="hidden group-hover:block p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Expanded step editor */}
            {selectedRouteId === route.id && (
              <RouteStepEditor
                route={route}
                workstations={workstations}
                onReload={onReload}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Route Step Editor ---

function RouteStepEditor({
  route,
  workstations,
  onReload,
}: {
  route: MfgRoute;
  workstations: Workstation[];
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [newStepWsId, setNewStepWsId] = useState("");
  const [newStepGate, setNewStepGate] = useState(true);
  const [newStepCycleTime, setNewStepCycleTime] = useState("");
  const [deletingStepIndex, setDeletingStepIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedSteps = [...route.route_steps].sort(
    (a, b) => a.step_number - b.step_number,
  );

  function mapStep(s: RouteStep, i: number) {
    return {
      workstation_id: s.workstation_id,
      step_number: i + 1,
      name: s.name,
      pass_fail_gate: s.pass_fail_gate,
      ...(s.ideal_cycle_time_seconds != null ? { ideal_cycle_time_seconds: s.ideal_cycle_time_seconds } : {}),
    };
  }

  function handleAddStep() {
    if (!newStepName.trim() || !newStepWsId) return;
    const cycleTime = newStepCycleTime ? Number(newStepCycleTime) : undefined;
    const newSteps = [
      ...sortedSteps.map((s, i) => mapStep(s, i)),
      {
        workstation_id: newStepWsId,
        step_number: sortedSteps.length + 1,
        name: newStepName.trim(),
        pass_fail_gate: newStepGate,
        ...(cycleTime && cycleTime > 0 ? { ideal_cycle_time_seconds: cycleTime } : {}),
      },
    ];
    startTransition(async () => {
      await editRoute(route.id, undefined, newSteps);
      setNewStepName("");
      setNewStepWsId("");
      setNewStepGate(true);
      setNewStepCycleTime("");
      setShowAdd(false);
      onReload();
    });
  }

  function handleRemoveStep(stepIndex: number) {
    const newSteps = sortedSteps
      .filter((_, i) => i !== stepIndex)
      .map((s, i) => mapStep(s, i));
    startTransition(async () => {
      await editRoute(route.id, undefined, newSteps);
      onReload();
    });
  }

  function handleMoveStep(stepIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedSteps.length) return;
    const reordered = [...sortedSteps];
    [reordered[stepIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[stepIndex]];
    const newSteps = reordered.map((s, i) => mapStep(s, i));
    startTransition(async () => {
      await editRoute(route.id, undefined, newSteps);
      onReload();
    });
  }

  function handleToggleGate(stepIndex: number) {
    const newSteps = sortedSteps.map((s, i) => ({
      ...mapStep(s, i),
      pass_fail_gate: i === stepIndex ? !s.pass_fail_gate : s.pass_fail_gate,
    }));
    startTransition(async () => {
      await editRoute(route.id, undefined, newSteps);
      onReload();
    });
  }

  return (
    <div className="bg-bg-app/30 border-b border-border">
      {/* Steps */}
      {sortedSteps.map((step, index) => (
        <div
          key={step.id}
          className="group flex items-center gap-1.5 px-4 py-2 border-b border-border/50"
        >
          <div className="flex flex-col items-center shrink-0">
            <button
              onClick={() => handleMoveStep(index, "up")}
              disabled={pending || index === 0}
              className="p-0.5 rounded text-text-secondary/40 hover:text-accent hover:bg-accent/10 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <ChevronUp size={10} />
            </button>
            <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-mono text-accent">
              {index + 1}
            </span>
            <button
              onClick={() => handleMoveStep(index, "down")}
              disabled={pending || index >= sortedSteps.length - 1}
              className="p-0.5 rounded text-text-secondary/40 hover:text-accent hover:bg-accent/10 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <ChevronDown size={10} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-primary truncate">{step.name}</div>
            <div className="text-[10px] text-text-secondary/60 truncate">
              {step.workstations?.name ?? "Unknown workstation"}
              {step.ideal_cycle_time_seconds != null && (
                <span className="ml-1">· {step.ideal_cycle_time_seconds}s</span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleToggleGate(index)}
            disabled={pending}
            className={`p-1 rounded transition-colors ${
              step.pass_fail_gate
                ? "text-success hover:bg-success/10"
                : "text-text-secondary/40 hover:bg-bg-app"
            }`}
            title={step.pass_fail_gate ? "Pass/fail gate (click to disable)" : "No gate (click to enable)"}
          >
            {step.pass_fail_gate ? <Shield size={12} /> : <ShieldOff size={12} />}
          </button>
          {deletingStepIndex === index ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setDeletingStepIndex(null); handleRemoveStep(index); }}
                disabled={pending}
                className="p-1 rounded bg-error/10 text-error hover:bg-error/20"
              >
                <Check size={10} />
              </button>
              <button
                onClick={() => setDeletingStepIndex(null)}
                className="p-1 rounded hover:bg-bg-app text-text-secondary"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeletingStepIndex(index)}
              disabled={pending}
              className="hidden group-hover:block p-1 rounded hover:bg-error/10 text-text-secondary hover:text-error"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}

      {/* Add step */}
      {showAdd ? (
        <div className="px-4 py-2 space-y-1.5">
          <input
            autoFocus
            value={newStepName}
            onChange={(e) => setNewStepName(e.target.value)}
            placeholder="Step name..."
            className="w-full px-2 py-1 text-xs rounded border border-accent bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            disabled={pending}
          />
          <select
            value={newStepWsId}
            onChange={(e) => setNewStepWsId(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded border border-border bg-bg-app text-text-primary focus:outline-none"
            disabled={pending}
          >
            <option value="">Select workstation...</option>
            {workstations.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            step="1"
            value={newStepCycleTime}
            onChange={(e) => setNewStepCycleTime(e.target.value)}
            placeholder="Cycle time (seconds, optional)"
            className="w-full px-2 py-1 text-xs rounded border border-border bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            disabled={pending}
          />
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={newStepGate}
              onChange={(e) => setNewStepGate(e.target.checked)}
              className="rounded border-border"
            />
            Pass/fail gate
          </label>
          <div className="flex gap-1">
            <button
              onClick={handleAddStep}
              disabled={pending || !newStepName.trim() || !newStepWsId}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Check size={10} /> Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:bg-bg-app"
            >
              <X size={10} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full px-4 py-2 flex items-center gap-1.5 text-xs text-accent hover:bg-accent/5 transition-colors"
        >
          <Plus size={12} /> Add step
        </button>
      )}
    </div>
  );
}

// --- Shared Components ---

function PanelHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd?: () => void;
}) {
  return (
    <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
      <h2 className="text-sm font-semibold text-text-primary truncate">
        {title}
      </h2>
      {onAdd && (
        <button
          onClick={onAdd}
          className="w-6 h-6 rounded flex items-center justify-center text-accent hover:bg-accent/10 transition-colors"
          title="Add new"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: React.ReactNode;
  message: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
      <div className="text-text-secondary/40 mb-3">{icon}</div>
      <p className="text-sm font-medium text-text-secondary">{message}</p>
      <p className="text-xs text-text-secondary/60 mt-1">{hint}</p>
    </div>
  );
}
