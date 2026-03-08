"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/stores/ui-store";
import { RunPanels } from "./run-panels";

export default function RunPage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("run");
  }, []);

  return <RunPanels />;
}
