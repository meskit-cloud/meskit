"use client";

import { Gauge } from "lucide-react";

interface OeeData {
  availability_percent: number;
  performance_percent: number;
  quality_percent: number;
  oee_percent: number;
}

interface Props {
  data: OeeData | null;
}

function factorColor(pct: number): string {
  if (pct >= 85) return "text-success";
  if (pct >= 60) return "text-warning";
  return "text-error";
}

function barColor(pct: number): string {
  if (pct >= 85) return "bg-success";
  if (pct >= 60) return "bg-warning";
  return "bg-error";
}

function OeeFactor({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className={`text-xs font-mono font-semibold ${factorColor(value)}`}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function OeeGauge({ data }: Props) {
  const oee = data?.oee_percent ?? 0;
  const hasData = data !== null;

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={14} className="text-success" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          OEE
        </span>
      </div>

      {!hasData ? (
        <div className="h-32 flex items-center justify-center text-xs text-text-secondary">
          No OEE data
        </div>
      ) : (
        <div className="space-y-3">
          {/* Combined OEE */}
          <div className="text-center py-2">
            <span className={`text-3xl font-bold font-mono ${factorColor(oee)}`}>
              {oee}%
            </span>
            <p className="text-xs text-text-secondary mt-0.5">
              Overall Equipment Effectiveness
            </p>
          </div>

          {/* Factor bars */}
          <OeeFactor label="Availability" value={data.availability_percent} />
          <OeeFactor label="Performance" value={data.performance_percent} />
          <OeeFactor label="Quality" value={data.quality_percent} />
        </div>
      )}
    </div>
  );
}
