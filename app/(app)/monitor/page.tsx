"use client";

import { useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";

export default function MonitorPage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("monitor");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <BarChart3 size={32} className="text-accent" />
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">
        Monitor Mode
      </h1>
      <p className="text-sm text-text-secondary max-w-md">
        View dashboards — throughput charts, yield summaries, WIP tracking, and
        AI-powered quality insights. Available in M5.
      </p>
    </div>
  );
}
