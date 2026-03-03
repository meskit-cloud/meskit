"use client";

import { useEffect } from "react";
import { Play } from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";

export default function RunPage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("run");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Play size={32} className="text-accent" />
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">Run Mode</h1>
      <p className="text-sm text-text-secondary max-w-md">
        Execute production — generate units, move them through routes, run
        simulations, and log quality events. Available in M4.
      </p>
    </div>
  );
}
