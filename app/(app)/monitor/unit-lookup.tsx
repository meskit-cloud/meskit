"use client";

import { useState, useTransition } from "react";
import { Search, Package } from "lucide-react";
import { findUnitBySerial } from "./actions";

interface UnitResult {
  unit: {
    id: string;
    serial_number: string;
    status: string;
    current_step: number;
    part_number_name: string | null;
    route_name: string | null;
    created_at: string;
  };
  history: {
    id: string;
    result: string;
    timestamp: string;
    route_steps?: { step_number: number; name: string; pass_fail_gate: boolean } | null;
    workstations?: { name: string } | null;
    defect_codes?: { code: string; description: string; severity: string } | null;
  }[];
}

const statusColors: Record<string, string> = {
  in_progress: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
  scrapped: "bg-error/10 text-error",
};

export function UnitLookup() {
  const [serial, setSerial] = useState("");
  const [result, setResult] = useState<UnitResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    if (!serial.trim()) return;
    startTransition(async () => {
      const data = await findUnitBySerial(serial.trim());
      if (data) {
        setResult(data as unknown as UnitResult);
        setNotFound(false);
      } else {
        setResult(null);
        setNotFound(true);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className="bg-bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package size={14} className="text-text-secondary" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Unit Lookup
        </span>
      </div>

      {/* Search input */}
      <div className="flex gap-1.5 mb-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Enter serial number..."
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-border bg-bg-app text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={pending || !serial.trim()}
          className="px-3 py-1.5 text-xs rounded bg-accent text-white font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          {pending ? "..." : "Search"}
        </button>
      </div>

      {/* Not found */}
      {notFound && (
        <p className="text-xs text-text-secondary text-center py-4">
          Unit not found
        </p>
      )}

      {/* Unit details */}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono font-semibold text-text-primary">
              {result.unit.serial_number}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[result.unit.status] ?? ""}`}>
              {result.unit.status.replace("_", " ")}
            </span>
          </div>
          <div className="text-xs text-text-secondary space-y-0.5 mb-3">
            {result.unit.part_number_name && <p>Part: {result.unit.part_number_name}</p>}
            {result.unit.route_name && <p>Route: {result.unit.route_name}</p>}
            <p>Step: {result.unit.current_step}</p>
            <p>Created: {new Date(result.unit.created_at).toLocaleString()}</p>
          </div>

          {/* Route history */}
          {result.history.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Route History
              </span>
              <div className="mt-1.5 space-y-1">
                {result.history.map((entry) => {
                  const step = entry.route_steps as UnitResult["history"][0]["route_steps"];
                  const ws = entry.workstations as UnitResult["history"][0]["workstations"];
                  return (
                    <div key={entry.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.result === "pass" ? "bg-success" : "bg-error"}`} />
                      <span className="text-text-primary">
                        {step?.name ?? "Step"}
                      </span>
                      {ws?.name && (
                        <span className="text-text-secondary">@ {ws.name}</span>
                      )}
                      <span className="ml-auto text-text-secondary font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
