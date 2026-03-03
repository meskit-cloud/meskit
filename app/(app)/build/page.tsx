"use client";

import { useEffect } from "react";
import { Hammer } from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";

export default function BuildPage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("build");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Hammer size={32} className="text-accent" />
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">Build Mode</h1>
      <p className="text-sm text-text-secondary max-w-md">
        Set up your shop floor — create lines, add workstations, and register
        machines. Use the chat panel to get started:
      </p>
      <p className="text-sm text-text-secondary mt-2 font-mono bg-bg-surface border border-border rounded-lg px-4 py-2">
        &quot;Create a line called Assembly&quot;
      </p>
    </div>
  );
}
