"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/stores/ui-store";
import { MonitorPanels } from "./monitor-panels";

export default function MonitorPage() {
  useEffect(() => {
    useUiStore.getState().setActiveMode("monitor");
  }, []);

  return <MonitorPanels />;
}
