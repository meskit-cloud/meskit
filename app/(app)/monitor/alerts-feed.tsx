"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Alert {
  id: string;
  timestamp: string;
  workstation_name: string;
  severity: string;
  summary: string;
}

export function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to quality_events for new fail/scrap events
    const channel = supabase
      .channel("monitor-quality-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quality_events" },
        (payload) => {
          const event = payload.new as {
            id: string;
            result: string;
            event_type: string;
            timestamp: string;
            notes?: string;
          };
          // Only show fail/scrap events as alerts
          if (event.result !== "fail") return;
          setAlerts((prev) => [
            {
              id: event.id,
              timestamp: event.timestamp,
              workstation_name: "",
              severity: event.event_type === "scrap" ? "critical" : "major",
              summary: event.notes || `${event.event_type} — ${event.result}`,
            },
            ...prev,
          ].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const severityColors: Record<string, string> = {
    critical: "text-error",
    major: "text-warning",
    minor: "text-text-secondary",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Alerts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="px-3 py-4 text-xs text-text-secondary text-center">
            No alerts
          </p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="px-3 py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <AlertTriangle size={10} className={severityColors[alert.severity] ?? "text-warning"} />
                <span className={`text-xs font-medium ${severityColors[alert.severity] ?? ""}`}>
                  {alert.severity}
                </span>
                <span className="ml-auto text-xs text-text-secondary font-mono">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-text-primary truncate">
                {alert.summary}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
