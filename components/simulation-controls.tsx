"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw, ChevronDown } from "lucide-react";
import { useSimulationStore, type SimulationSpeed } from "@/lib/stores/simulation-store";
import type { SimulationScenario } from "@/lib/agents/simulator";

const SCENARIOS: { key: SimulationScenario; label: string }[] = [
  { key: "steady_state", label: "Steady State" },
  { key: "quality_crisis", label: "Quality Crisis" },
  { key: "machine_breakdown", label: "Machine Breakdown" },
  { key: "ramp_up", label: "Ramp Up" },
  { key: "mixed_product", label: "Mixed Product" },
  { key: "cascade_failure", label: "Cascade Failure" },
];

const SPEEDS: SimulationSpeed[] = ["1x", "2x", "5x", "10x"];

export function SimulationControls() {
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const { status, speed, scenario, start, pause, resume, reset, setSpeed, setScenario } =
    useSimulationStore();

  function handlePlayPause() {
    if (status === "idle") start();
    else if (status === "running") pause();
    else if (status === "paused") resume();
  }

  const scenarioLabel = SCENARIOS.find((s) => s.key === scenario)?.label ?? scenario;

  return (
    <div className="flex items-center gap-1">
      {/* Scenario selector */}
      <div className="relative">
        <button
          onClick={() => setScenarioOpen(!scenarioOpen)}
          disabled={status === "running"}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-bg-app text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
        >
          <span className="max-w-[120px] truncate">{scenarioLabel}</span>
          <ChevronDown size={10} />
        </button>
        {scenarioOpen && (
          <div className="absolute top-full left-0 mt-1 bg-bg-surface border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setScenario(s.key);
                  setScenarioOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-app transition-colors ${
                  s.key === scenario ? "text-accent font-medium" : "text-text-secondary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Speed selector */}
      <select
        value={speed}
        onChange={(e) => setSpeed(e.target.value as SimulationSpeed)}
        className="text-xs px-2 py-1 rounded border border-border bg-bg-app text-text-secondary focus:outline-none"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        className={`p-1.5 rounded-lg transition-colors ${
          status === "running"
            ? "bg-accent/10 text-accent hover:bg-accent/20"
            : "text-text-secondary hover:bg-bg-app"
        }`}
        title={status === "running" ? "Pause simulation" : status === "paused" ? "Resume simulation" : "Start simulation"}
      >
        {status === "running" ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Reset */}
      {status !== "idle" && (
        <button
          onClick={reset}
          className="p-1.5 rounded-lg text-text-secondary hover:bg-bg-app transition-colors"
          title="Reset simulation"
        >
          <RotateCcw size={16} />
        </button>
      )}

      {/* Status indicator */}
      {status !== "idle" && (
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            status === "running"
              ? "bg-accent/10 text-accent"
              : "bg-bg-app text-text-secondary"
          }`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
