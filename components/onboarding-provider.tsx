"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/lib/stores/chat-store";
import { useUiStore } from "@/lib/stores/ui-store";

const WELCOME_MESSAGE = `Welcome to MESkit! Your shop floor is empty — let's fix that.

I can:
1. **Set up a demo shop floor** — I'll create an Assembly line, workstations, machines, a part number with BOM and route. Ready to run in seconds.
2. **Guide you step by step** — I'll walk you through creating your first line, configuring a product, and running your first order.

Just tell me which you'd prefer, or ask me anything!`;

export function OnboardingProvider() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const messages = useChatStore.getState().messages;
    if (messages.length > 0) return; // already has conversation

    const supabase = createClient();
    supabase
      .from("lines")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count !== null && count > 0) return; // shop floor exists

        // First run: open chat and inject welcome message
        useUiStore.getState().setChatPanelOpen(true);
        useChatStore.getState().addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: WELCOME_MESSAGE,
          timestamp: new Date().toISOString(),
        });
      });
  }, []);

  return null;
}
