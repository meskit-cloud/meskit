"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/stores/chat-store";

export function QualityMonitorProvider() {
  const addMessage = useChatStore((s) => s.addMessage);
  const checkInProgress = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("quality-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quality_events" },
        async (payload) => {
          // Skip if a check is already running (debounce concurrent triggers)
          if (checkInProgress.current) return;
          checkInProgress.current = true;

          try {
            const res = await fetch("/api/quality-monitor/check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                triggerEvent: "quality_event_insert",
                triggerData: payload.new,
              }),
            });

            if (!res.ok) return;

            const data = await res.json();
            if (data.alert) {
              // Surface the alert as a proactive assistant message in the chat panel
              addMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.alert,
                timestamp: new Date().toISOString(),
              });
            }
          } catch {
            // Fail silently — quality monitor is fire-and-forget
          } finally {
            checkInProgress.current = false;
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addMessage]);

  return null;
}
