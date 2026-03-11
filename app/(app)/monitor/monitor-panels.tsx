"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThroughputChart } from "./throughput-chart";
import { YieldChart } from "./yield-chart";
import { OeeGauge } from "./oee-gauge";
import { UnitLookup } from "./unit-lookup";
import { OrderTracker } from "./order-tracker";
import { AlertsFeed } from "./alerts-feed";
import {
  fetchThroughput,
  fetchYield,
  fetchOee,
  fetchOrderSummary,
  fetchWip,
} from "./actions";

// --- Types ---

type TimeRange = "today" | "last_8_hours" | "last_24_hours" | "last_7_days" | "last_30_days";

interface ThroughputData {
  total_completed: number;
  units: { id: string; created_at: string }[];
}

interface YieldEntry {
  workstation_id: string;
  workstation_name: string;
  total_inspected: number;
  pass_count: number;
  fail_count: number;
  yield_percent: number | null;
}

interface OeeData {
  availability_percent: number;
  performance_percent: number;
  quality_percent: number;
  oee_percent: number;
}

interface OrderSummary {
  id: string;
  order_number: string;
  part_number_name: string | null;
  status: string;
  quantity_ordered: number;
  quantity_completed: number;
  completion_percent: number;
  units_remaining: number;
  estimated_finish: string | null;
  throughput_rate_per_hour: number;
}

interface WipEntry {
  workstation_id: string;
  workstation_name: string;
  unit_count: number;
}

// --- Time range labels ---

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last_8_hours", label: "8h" },
  { value: "last_24_hours", label: "24h" },
  { value: "last_7_days", label: "7d" },
  { value: "last_30_days", label: "30d" },
];

// --- Main Component ---

export function MonitorPanels() {
  const [timeRange, setTimeRange] = useState<TimeRange>("last_24_hours");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [throughput, setThroughput] = useState<ThroughputData | null>(null);
  const [yieldData, setYieldData] = useState<YieldEntry[]>([]);
  const [oee, setOee] = useState<OeeData | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [wip, setWip] = useState<WipEntry[]>([]);

  // --- Data fetching ---

  const loadThroughput = useCallback(async (tr: TimeRange) => {
    try {
      const data = await fetchThroughput(tr);
      setThroughput(data as ThroughputData);
    } catch { /* silent */ }
  }, []);

  const loadYield = useCallback(async (tr: TimeRange) => {
    try {
      const data = await fetchYield(tr);
      setYieldData(data as YieldEntry[]);
    } catch { /* silent */ }
  }, []);

  const loadOee = useCallback(async (tr: TimeRange) => {
    try {
      const data = await fetchOee(tr);
      setOee(data as OeeData);
    } catch { /* silent */ }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrderSummary();
      setOrders(data as OrderSummary[]);
    } catch { /* silent */ }
  }, []);

  const loadWip = useCallback(async () => {
    try {
      const data = await fetchWip();
      setWip(data as WipEntry[]);
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async (tr: TimeRange) => {
    await Promise.all([
      loadThroughput(tr),
      loadYield(tr),
      loadOee(tr),
      loadOrders(),
      loadWip(),
    ]);
  }, [loadThroughput, loadYield, loadOee, loadOrders, loadWip]);

  // Initial load
  useEffect(() => {
    loadAll(timeRange);
  }, [timeRange, loadAll]);

  // --- Supabase Realtime subscriptions ---

  useEffect(() => {
    const supabase = createClient();

    const unitsChannel = supabase
      .channel("monitor-units")
      .on("postgres_changes", { event: "*", schema: "public", table: "units" }, () => {
        loadThroughput(timeRange);
        loadWip();
        loadOrders();
      })
      .subscribe();

    const qualityChannel = supabase
      .channel("monitor-quality")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quality_events" }, () => {
        loadYield(timeRange);
        loadOee(timeRange);
      })
      .subscribe();

    const ordersChannel = supabase
      .channel("monitor-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(unitsChannel);
      supabase.removeChannel(qualityChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [timeRange, loadThroughput, loadYield, loadOee, loadWip, loadOrders]);

  // --- Render ---

  const totalWip = wip.reduce((sum, w) => sum + w.unit_count, 0);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left Panel — Order Tracker */}
      <OrderTracker
        orders={orders}
        selectedOrderId={selectedOrderId}
        onSelect={setSelectedOrderId}
      />

      {/* Center Panel — Charts */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Time range selector */}
        <div className="px-4 py-2.5 border-b border-border bg-bg-surface flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-text-secondary mr-1">Range:</span>
          {timeRangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                timeRange === opt.value
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-text-secondary hover:bg-bg-app"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Charts grid */}
        <div className="p-4 space-y-4">
          <ThroughputChart data={throughput} timeRange={timeRange} />

          <div className="grid grid-cols-2 gap-4">
            <YieldChart data={yieldData} />
            <OeeGauge data={oee} />
          </div>

          <UnitLookup />
        </div>
      </div>

      {/* Right Panel — WIP + Alerts */}
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
                <div
                  key={entry.workstation_id}
                  className="px-3 py-2 flex items-center justify-between border-b border-border/50 last:border-0"
                >
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

        {/* Alerts Feed */}
        <AlertsFeed />
      </div>
    </div>
  );
}
