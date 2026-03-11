"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface ThroughputData {
  total_completed: number;
  units: { id: string; created_at: string }[];
}

interface Props {
  data: ThroughputData | null;
  timeRange: string;
}

export function ThroughputChart({ data, timeRange }: Props) {
  const chartData = useMemo(() => {
    if (!data?.units || data.units.length === 0) return [];

    // Bucket units into hourly intervals
    const buckets = new Map<string, number>();
    for (const unit of data.units) {
      const date = new Date(unit.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({
        time: time.split(" ")[1] ?? time,
        units: count,
      }));
  }, [data]);

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-accent" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Throughput
          </span>
        </div>
        <span className="text-xs text-text-secondary">
          {data?.total_completed ?? 0} units · {timeRange.replace(/_/g, " ")}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-text-secondary">
          No throughput data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--color-text-secondary)" }}
            />
            <Line
              type="monotone"
              dataKey="units"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-accent)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
