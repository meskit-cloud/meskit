"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface YieldEntry {
  workstation_id: string;
  workstation_name: string;
  total_inspected: number;
  pass_count: number;
  fail_count: number;
  yield_percent: number | null;
}

interface Props {
  data: YieldEntry[];
}

function yieldColor(pct: number | null): string {
  if (pct === null) return "var(--color-text-secondary)";
  if (pct >= 90) return "var(--color-success)";
  if (pct >= 80) return "var(--color-warning)";
  return "var(--color-error)";
}

export function YieldChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.workstation_name,
    yield: d.yield_percent ?? 0,
    pass: d.pass_count,
    fail: d.fail_count,
    total: d.total_inspected,
    raw: d.yield_percent,
  }));

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-agent" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Yield by Workstation
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-text-secondary">
          No yield data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, _name: string, props: { payload?: { pass: number; fail: number; total: number } }) => [
                `${value}% (${props.payload?.pass ?? 0} pass / ${props.payload?.fail ?? 0} fail)`,
                "Yield",
              ]}
            />
            <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={yieldColor(entry.raw)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
