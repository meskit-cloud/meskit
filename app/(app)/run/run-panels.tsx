"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import {
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronRight,
  Cpu,
  X,
  Check,
  AlertTriangle,
  PackageOpen,
  ClipboardList,
} from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  fetchOrders,
  addOrder,
  changeOrderStatus,
  fetchUnitsForOrder,
  fetchRouteSteps,
  spawnUnits,
  advanceUnit,
  passUnit,
  failUnit,
  scrapSelectedUnit,
  fetchWip,
  fetchDefectCodes,
  addDefectCode,
  fetchAllPartNumbers,
  fetchRoutesByPartNumber,
} from "./actions";

// --- Types ---

interface ProductionOrder {
  id: string;
  order_number: string;
  part_number_id: string;
  route_id: string;
  quantity_ordered: number;
  quantity_completed: number;
  status: "new" | "scheduled" | "running" | "complete" | "closed";
  created_at: string;
  part_numbers: { name: string } | null;
  routes: { name: string } | null;
}

interface Unit {
  id: string;
  serial_number: string;
  status: "in_progress" | "completed" | "scrapped";
  current_step: number;
  part_number_id: string;
  route_id: string;
  production_order_id: string | null;
}

interface RouteStep {
  id: string;
  step_number: number;
  name: string;
  pass_fail_gate: boolean;
  workstation_id: string;
  workstations: { name: string } | null;
}

interface WipEntry {
  workstation_id: string;
  workstation_name: string;
  unit_count: number;
}

interface DefectCode {
  id: string;
  code: string;
  description: string;
  severity: "minor" | "major" | "critical";
}

interface PartNumber { id: string; name: string }
interface MfgRoute { id: string; name: string; part_number_id: string }

// --- Helpers ---

const statusColors: Record<ProductionOrder["status"], string> = {
  new:       "bg-text-secondary/10 text-text-secondary",
  scheduled: "bg-accent/10 text-accent",
  running:   "bg-success/10 text-success",
  complete:  "bg-agent/10 text-agent",
  closed:    "bg-border text-text-secondary",
};

const unitStatusColors: Record<Unit["status"], string> = {
  in_progress: "bg-accent/10 text-accent",
  completed:   "bg-success/10 text-success",
  scrapped:    "bg-error/10 text-error",
};

const severityColors: Record<DefectCode["severity"], string> = {
  minor:    "text-text-secondary",
  major:    "text-warning",
  critical: "text-error",
};

// --- Main Component ---

export function RunPanels() {
  const { selectProductionOrder, clearSelections } = useUiStore();

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);

  const [wip, setWip] = useState<WipEntry[]>([]);
  const [defectCodes, setDefectCodes] = useState<DefectCode[]>([]);

  // Clear cross-mode selections on mount
  useEffect(() => {
    clearSelections();
    useUiStore.getState().setActiveMode("run");
  }, [clearSelections]);

  // Load orders
  const loadOrders = useCallback(async () => {
    const data = await fetchOrders();
    setOrders((data as ProductionOrder[]) ?? []);
    setOrdersLoaded(true);
  }, []);

  // Load units + route steps for selected order
  const loadUnits = useCallback(async (order: ProductionOrder) => {
    setUnitsLoaded(false);
    const [unitData, stepData] = await Promise.all([
      fetchUnitsForOrder(order.id),
      fetchRouteSteps(order.route_id),
    ]);
    setUnits((unitData as Unit[]) ?? []);
    setRouteSteps(stepData ?? []);
    setUnitsLoaded(true);
  }, []);

  // Load WIP and defect codes
  const loadSidePanel = useCallback(async () => {
    const [wipData, dcData] = await Promise.all([fetchWip(), fetchDefectCodes()]);
    setWip((wipData as WipEntry[]) ?? []);
    setDefectCodes((dcData as DefectCode[]) ?? []);
  }, []);

  useEffect(() => {
    loadOrders();
    loadSidePanel();
  }, [loadOrders, loadSidePanel]);

  useEffect(() => {
    if (!selectedOrderId) return;
    const order = orders.find((o) => o.id === selectedOrderId);
    if (order) loadUnits(order);
  }, [selectedOrderId, orders, loadUnits]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const ordersChannel = supabase
      .channel("run-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_orders" }, () => {
        loadOrders();
      })
      .subscribe();

    const unitsChannel = supabase
      .channel("run-units")
      .on("postgres_changes", { event: "*", schema: "public", table: "units" }, () => {
        if (selectedOrderId) {
          const order = orders.find((o) => o.id === selectedOrderId);
          if (order) loadUnits(order);
        }
        loadSidePanel();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(unitsChannel);
    };
  }, [selectedOrderId, orders, loadOrders, loadUnits, loadSidePanel]);

  function handleSelectOrder(order: ProductionOrder) {
    setSelectedOrderId(order.id);
    setUnits([]);
    setUnitsLoaded(false);
    selectProductionOrder(order.id, order.order_number);
  }

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  return (
    <div className="flex flex-1 min-h-0">
      <OrdersPanel
        orders={orders}
        ordersLoaded={ordersLoaded}
        selectedOrderId={selectedOrderId}
        onSelect={handleSelectOrder}
        onOrderCreated={loadOrders}
      />
      <UnitsPanel
        order={selectedOrder}
        units={units}
        unitsLoaded={unitsLoaded}
        routeSteps={routeSteps}
        defectCodes={defectCodes}
        onReload={() => {
          loadOrders();
          if (selectedOrder) loadUnits(selectedOrder);
          loadSidePanel();
        }}
      />
      <WipPanel
        wip={wip}
        defectCodes={defectCodes}
        onDefectCodeAdded={() => loadSidePanel()}
      />
    </div>
  );
}

// --- Orders Panel (Left) ---

function OrdersPanel({
  orders,
  ordersLoaded,
  selectedOrderId,
  onSelect,
  onOrderCreated,
}: {
  orders: ProductionOrder[];
  ordersLoaded: boolean;
  selectedOrderId: string | null;
  onSelect: (o: ProductionOrder) => void;
  onOrderCreated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([]);
  const [routes, setRoutes] = useState<MfgRoute[]>([]);
  const [selectedPnId, setSelectedPnId] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [qty, setQty] = useState("10");
  const [statusFilter, setStatusFilter] = useState<ProductionOrder["status"] | "all">("all");

  async function openCreate() {
    const pns = await fetchAllPartNumbers();
    setPartNumbers((pns as PartNumber[]) ?? []);
    setSelectedPnId("");
    setSelectedRouteId("");
    setQty("10");
    setShowCreate(true);
  }

  async function handlePnChange(pnId: string) {
    setSelectedPnId(pnId);
    setSelectedRouteId("");
    if (pnId) {
      const r = await fetchRoutesByPartNumber(pnId);
      setRoutes((r as MfgRoute[]) ?? []);
    } else {
      setRoutes([]);
    }
  }

  function handleCreate() {
    if (!selectedPnId || !selectedRouteId || !qty) return;
    startTransition(async () => {
      await addOrder(selectedPnId, selectedRouteId, parseInt(qty, 10));
      setShowCreate(false);
      onOrderCreated();
    });
  }

  const filtered = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="w-64 bg-bg-surface border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Orders
        </span>
        <button
          onClick={openCreate}
          className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-bg-app hover:text-text-primary transition-colors"
          title="New order"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-3 py-2.5 border-b border-border bg-bg-app space-y-2">
          <select
            value={selectedPnId}
            onChange={(e) => handlePnChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Part number…</option>
            {partNumbers.map((pn) => (
              <option key={pn.id} value={pn.id}>{pn.name}</option>
            ))}
          </select>
          {selectedPnId && (
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Route…</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              className="w-20 px-2 py-1.5 text-sm rounded border border-border bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleCreate}
              disabled={pending || !selectedPnId || !selectedRouteId || !qty}
              className="flex-1 px-3 py-1.5 text-sm rounded bg-accent text-white font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:bg-bg-surface rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="px-3 py-1.5 border-b border-border flex gap-1 flex-wrap">
        {(["all", "running", "new", "complete"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              statusFilter === s
                ? "bg-accent/10 text-accent font-medium"
                : "text-text-secondary hover:bg-bg-app"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto">
        {ordersLoaded && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <ClipboardList size={28} className="text-text-secondary/40 mb-3" />
            <p className="text-xs text-text-secondary">No orders</p>
            <p className="text-xs text-text-secondary/60 mt-1">
              Click + to create one
            </p>
          </div>
        )}
        {filtered.map((order) => {
          const isSelected = order.id === selectedOrderId;
          const pct = order.quantity_ordered > 0
            ? Math.round((order.quantity_completed / order.quantity_ordered) * 100)
            : 0;
          return (
            <button
              key={order.id}
              onClick={() => onSelect(order)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${
                isSelected ? "bg-accent/5" : "hover:bg-bg-app"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-mono font-medium ${isSelected ? "text-accent" : "text-text-primary"}`}>
                  {order.order_number}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <div className="text-xs text-text-secondary truncate">
                {(order.part_numbers as { name: string } | null)?.name ?? "—"}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary font-mono">
                  {order.quantity_completed}/{order.quantity_ordered}
                </span>
              </div>
              {isSelected && <ChevronRight size={12} className="text-accent ml-auto mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Units Panel (Center) ---

function UnitsPanel({
  order,
  units,
  unitsLoaded,
  routeSteps,
  defectCodes,
  onReload,
}: {
  order: ProductionOrder | null;
  units: Unit[];
  unitsLoaded: boolean;
  routeSteps: RouteStep[];
  defectCodes: DefectCode[];
  onReload: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCount, setGenCount] = useState("5");

  // Per-unit action state
  const [actionUnitId, setActionUnitId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"scrap" | "fail" | null>(null);
  const [selectedDefectId, setSelectedDefectId] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  function getStep(unit: Unit): RouteStep | undefined {
    return routeSteps.find((s) => s.step_number === unit.current_step);
  }

  function handleGenerate() {
    if (!order || !genCount) return;
    startTransition(async () => {
      await spawnUnits(order.id, order.part_number_id, order.route_id, parseInt(genCount, 10));
      setShowGenerate(false);
      setGenCount("5");
      onReload();
    });
  }

  function handleMove(unit: Unit) {
    startTransition(async () => {
      await advanceUnit(unit.id);
      onReload();
    });
  }

  function handlePass(unit: Unit) {
    const step = getStep(unit);
    if (!step) return;
    startTransition(async () => {
      await passUnit(unit.id, step.workstation_id);
      onReload();
    });
  }

  function openFail(unit: Unit) {
    setActionUnitId(unit.id);
    setActionType("fail");
    setSelectedDefectId("");
    setActionNotes("");
  }

  function openScrap(unit: Unit) {
    setActionUnitId(unit.id);
    setActionType("scrap");
    setSelectedDefectId("");
    setActionNotes("");
  }

  function cancelAction() {
    setActionUnitId(null);
    setActionType(null);
  }

  function handleConfirmAction() {
    if (!actionUnitId || !actionType) return;
    const unit = units.find((u) => u.id === actionUnitId);
    if (!unit) return;

    if (actionType === "fail") {
      const step = getStep(unit);
      if (!step) return;
      startTransition(async () => {
        await failUnit(unit.id, step.workstation_id, selectedDefectId || undefined, actionNotes || undefined);
        cancelAction();
        onReload();
      });
    } else {
      startTransition(async () => {
        await scrapSelectedUnit(unit.id, selectedDefectId || undefined, actionNotes || undefined);
        cancelAction();
        onReload();
      });
    }
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <PackageOpen size={36} className="text-text-secondary/30 mb-4" />
        <p className="text-sm text-text-secondary">Select a production order</p>
        <p className="text-xs text-text-secondary/60 mt-1">
          Choose an order from the left panel to see its units
        </p>
      </div>
    );
  }

  const pct = order.quantity_ordered > 0
    ? Math.round((order.quantity_completed / order.quantity_ordered) * 100)
    : 0;

  const inProgress = units.filter((u) => u.status === "in_progress").length;
  const completed = units.filter((u) => u.status === "completed").length;
  const scrapped = units.filter((u) => u.status === "scrapped").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Order header */}
      <div className="px-4 py-3 border-b border-border bg-bg-surface shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-sm font-semibold text-text-primary">
                {order.order_number}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </div>
            <div className="text-xs text-text-secondary">
              {(order.part_numbers as { name: string } | null)?.name}
              {" · "}
              {(order.routes as { name: string } | null)?.name}
            </div>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            {order.status !== "closed" && order.status !== "complete" && (
              <button
                onClick={() => setShowGenerate(!showGenerate)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
              >
                <Plus size={12} />
                Generate units
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>{pct}% complete</span>
            <span className="font-mono">
              {order.quantity_completed}/{order.quantity_ordered}
              {inProgress > 0 && <span className="ml-1 text-accent">· {inProgress} WIP</span>}
              {scrapped > 0 && <span className="ml-1 text-error">· {scrapped} scrapped</span>}
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Generate form */}
        {showGenerate && (
          <div className="mt-2 flex gap-2 items-center">
            <input
              type="number"
              min="1"
              max="1000"
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
              className="w-20 px-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleGenerate}
              disabled={pending || !genCount}
              className="px-3 py-1.5 text-xs rounded bg-accent text-white font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
            >
              {pending ? "Generating…" : "Generate"}
            </button>
            <button onClick={() => setShowGenerate(false)} className="p-1.5 text-text-secondary hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto">
        {unitsLoaded && units.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen size={28} className="text-text-secondary/30 mb-3" />
            <p className="text-xs text-text-secondary">No units yet</p>
            <p className="text-xs text-text-secondary/60 mt-1">Click "Generate units" to create the first batch</p>
          </div>
        )}

        {units.map((unit) => {
          const step = getStep(unit);
          const isAtGate = step?.pass_fail_gate === true;
          const isActionTarget = actionUnitId === unit.id;

          return (
            <div key={unit.id} className="border-b border-border">
              <div className="px-4 py-2.5 flex items-center gap-3">
                {/* Serial */}
                <span className="font-mono text-sm font-medium text-text-primary w-32 shrink-0">
                  {unit.serial_number}
                </span>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  {unit.status === "in_progress" && unit.current_step === 0 && (
                    <span className="text-xs text-text-secondary">Not started</span>
                  )}
                  {unit.status === "in_progress" && unit.current_step > 0 && step && (
                    <div>
                      <span className="text-xs text-text-primary">
                        Step {step.step_number}: {step.name}
                      </span>
                      <span className="text-xs text-text-secondary ml-1.5">
                        @ {step.workstations?.name}
                      </span>
                      {isAtGate && (
                        <span className="ml-1.5 text-xs text-warning font-medium">· Gate</span>
                      )}
                    </div>
                  )}
                  {unit.status === "completed" && (
                    <span className="text-xs text-text-secondary">Route complete</span>
                  )}
                  {unit.status === "scrapped" && (
                    <span className="text-xs text-text-secondary">Scrapped</span>
                  )}
                </div>

                {/* Status badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${unitStatusColors[unit.status]}`}>
                  {unit.status.replace("_", " ")}
                </span>

                {/* Action buttons */}
                {unit.status === "in_progress" && !isActionTarget && (
                  <div className="flex gap-1 shrink-0">
                    {!isAtGate && (
                      <button
                        onClick={() => handleMove(unit)}
                        disabled={pending}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 transition-colors"
                      >
                        <Play size={10} />
                        Move
                      </button>
                    )}
                    {isAtGate && (
                      <>
                        <button
                          onClick={() => handlePass(unit)}
                          disabled={pending}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-success/10 text-success hover:bg-success/20 disabled:opacity-40 transition-colors"
                        >
                          <CheckCircle2 size={10} />
                          Pass
                        </button>
                        <button
                          onClick={() => openFail(unit)}
                          disabled={pending}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-error/10 text-error hover:bg-error/20 disabled:opacity-40 transition-colors"
                        >
                          <XCircle size={10} />
                          Fail
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openScrap(unit)}
                      disabled={pending}
                      className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-40"
                      title="Scrap unit"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Inline action form (fail / scrap) */}
              {isActionTarget && actionType && (
                <div className="px-4 pb-3 bg-bg-app border-t border-border">
                  <p className="text-xs font-medium text-text-primary mt-2 mb-1.5">
                    {actionType === "scrap" ? "Confirm scrap" : "Record failure"} — {unit.serial_number}
                  </p>
                  <select
                    value={selectedDefectId}
                    onChange={(e) => setSelectedDefectId(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-surface text-text-primary focus:outline-none focus:border-accent mb-1.5"
                  >
                    <option value="">Defect code (optional)…</option>
                    {defectCodes.map((dc) => (
                      <option key={dc.id} value={dc.id}>
                        {dc.code} — {dc.description}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Notes (optional)"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent mb-2"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleConfirmAction}
                      disabled={pending}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded font-medium disabled:opacity-40 transition-colors ${
                        actionType === "scrap"
                          ? "bg-error/10 text-error hover:bg-error/20"
                          : "bg-warning/10 text-warning hover:bg-warning/20"
                      }`}
                    >
                      <AlertTriangle size={10} />
                      {pending ? "Processing…" : actionType === "scrap" ? "Confirm scrap" : "Confirm fail"}
                    </button>
                    <button
                      onClick={cancelAction}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded text-text-secondary hover:bg-bg-surface transition-colors"
                    >
                      <X size={10} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- WIP Panel (Right) ---

function WipPanel({
  wip,
  defectCodes,
  onDefectCodeAdded,
}: {
  wip: WipEntry[];
  defectCodes: DefectCode[];
  onDefectCodeAdded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [showAddDc, setShowAddDc] = useState(false);
  const [dcCode, setDcCode] = useState("");
  const [dcDesc, setDcDesc] = useState("");
  const [dcSeverity, setDcSeverity] = useState<DefectCode["severity"]>("minor");

  function handleAddDefectCode() {
    if (!dcCode || !dcDesc) return;
    startTransition(async () => {
      await addDefectCode(dcCode, dcDesc, dcSeverity);
      setDcCode("");
      setDcDesc("");
      setDcSeverity("minor");
      setShowAddDc(false);
      onDefectCodeAdded();
    });
  }

  const totalWip = wip.reduce((sum, w) => sum + w.unit_count, 0);

  return (
    <div className="w-72 bg-bg-surface border-l border-border flex flex-col shrink-0">
      {/* WIP Tracker */}
      <div className="border-b border-border">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Live WIP
          </span>
          <span className="text-xs font-mono text-text-secondary">
            {totalWip} units
          </span>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {wip.length === 0 ? (
            <p className="px-3 py-4 text-xs text-text-secondary text-center">
              No units in progress
            </p>
          ) : (
            wip.map((entry) => (
              <div key={entry.workstation_id} className="px-3 py-2 flex items-center justify-between border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-text-secondary shrink-0" />
                  <span className="text-xs text-text-primary truncate">
                    {entry.workstation_name}
                  </span>
                </div>
                <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                  entry.unit_count > 0 ? "bg-accent/10 text-accent" : "text-text-secondary"
                }`}>
                  {entry.unit_count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Defect Codes */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Defect Codes
          </span>
          <button
            onClick={() => setShowAddDc(!showAddDc)}
            className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-bg-app hover:text-text-primary transition-colors"
          >
            {showAddDc ? <X size={13} /> : <Plus size={13} />}
          </button>
        </div>

        {showAddDc && (
          <div className="px-3 py-2.5 border-b border-border bg-bg-app space-y-1.5">
            <input
              placeholder="Code (e.g. SOL-001)"
              value={dcCode}
              onChange={(e) => setDcCode(e.target.value.toUpperCase())}
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
            />
            <input
              placeholder="Description"
              value={dcDesc}
              onChange={(e) => setDcDesc(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-surface text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
            />
            <select
              value={dcSeverity}
              onChange={(e) => setDcSeverity(e.target.value as DefectCode["severity"])}
              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
            <div className="flex gap-1.5">
              <button
                onClick={handleAddDefectCode}
                disabled={pending || !dcCode || !dcDesc}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-accent text-white font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
              >
                <Check size={10} /> Add
              </button>
              <button onClick={() => setShowAddDc(false)} className="px-2 py-1 text-xs text-text-secondary hover:bg-bg-surface rounded transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {defectCodes.length === 0 ? (
            <p className="px-3 py-4 text-xs text-text-secondary text-center">
              No defect codes yet
            </p>
          ) : (
            defectCodes.map((dc) => (
              <div key={dc.id} className="px-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-text-primary">
                    {dc.code}
                  </span>
                  <span className={`text-xs ${severityColors[dc.severity]}`}>
                    {dc.severity}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{dc.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
