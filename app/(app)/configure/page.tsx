"use client";

import { useEffect } from "react";
import { Settings } from "lucide-react";
import { useUiStore } from "@/lib/stores/ui-store";

export default function ConfigurePage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("configure");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Settings size={32} className="text-accent" />
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">
        Configure Mode
      </h1>
      <p className="text-sm text-text-secondary max-w-md">
        Define products, bills of materials, routes, and serial number
        algorithms. Available in M3.
      </p>
    </div>
  );
}
