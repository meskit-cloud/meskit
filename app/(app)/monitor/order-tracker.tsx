"use client";

import { ClipboardList, Clock } from "lucide-react";

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

interface Props {
  orders: OrderSummary[];
  selectedOrderId: string | null;
  onSelect: (orderId: string | null) => void;
}

const statusColors: Record<string, string> = {
  new: "bg-text-secondary/10 text-text-secondary",
  scheduled: "bg-accent/10 text-accent",
  running: "bg-success/10 text-success",
  complete: "bg-agent/10 text-agent",
  closed: "bg-border text-text-secondary",
};

export function OrderTracker({ orders, selectedOrderId, onSelect }: Props) {
  return (
    <div className="w-64 bg-bg-surface border-r border-border flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Production Orders
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <ClipboardList size={28} className="text-text-secondary/40 mb-3" />
            <p className="text-xs text-text-secondary">No production orders</p>
          </div>
        )}

        {orders.map((order) => {
          const isSelected = order.id === selectedOrderId;
          return (
            <button
              key={order.id}
              onClick={() => onSelect(isSelected ? null : order.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${
                isSelected ? "bg-accent/5" : "hover:bg-bg-app"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-mono font-medium ${isSelected ? "text-accent" : "text-text-primary"}`}>
                  {order.order_number}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[order.status] ?? ""}`}>
                  {order.status}
                </span>
              </div>
              <div className="text-xs text-text-secondary truncate mb-1.5">
                {order.part_number_name ?? "—"}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${order.completion_percent}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary font-mono">
                  {order.completion_percent}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-secondary font-mono">
                  {order.quantity_completed}/{order.quantity_ordered}
                </span>
                {order.estimated_finish && order.status === "running" && (
                  <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                    <Clock size={10} />
                    {new Date(order.estimated_finish).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
