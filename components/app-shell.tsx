"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Hammer,
  Settings,
  Play,
  BarChart3,
  MessageSquare,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
  HelpCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUiStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";

const modes = [
  { key: "build" as const, label: "Build", icon: Hammer, href: "/build" },
  {
    key: "configure" as const,
    label: "Configure",
    icon: Settings,
    href: "/configure",
  },
  { key: "run" as const, label: "Run", icon: Play, href: "/run" },
  {
    key: "monitor" as const,
    label: "Monitor",
    icon: BarChart3,
    href: "/monitor",
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeMode, setActiveMode } = useUiStore();

  return (
    <aside className="w-16 bg-bg-surface border-r border-border flex flex-col items-center py-4 gap-1 shrink-0">
      {modes.map((mode) => {
        const isActive =
          activeMode === mode.key || pathname === mode.href;
        return (
          <button
            key={mode.key}
            onClick={() => {
              setActiveMode(mode.key);
              router.push(mode.href);
            }}
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${isActive
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-bg-app"
              }`}
            title={mode.label}
          >
            <mode.icon size={20} />
            <span className="text-[10px] leading-none">{mode.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

export function TopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { chatPanelOpen, toggleChatPanel } = useUiStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-12 bg-bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold font-ui text-lg" aria-label="MESkit">
          <span className="text-text-primary">MES</span>
          <span className="text-accent">kit</span>
        </span>
        <span className="text-xs text-text-secondary font-mono bg-bg-app px-2 py-0.5 rounded">
          M3
        </span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/help"
          className="p-2 rounded-lg text-text-secondary hover:bg-bg-app transition-colors"
          title="Documentation"
        >
          <HelpCircle size={18} />
        </a>

        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-text-secondary hover:bg-bg-app transition-colors"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <button
          onClick={toggleChatPanel}
          className="p-2 rounded-lg text-text-secondary hover:bg-bg-app transition-colors"
          title={chatPanelOpen ? "Hide chat" : "Show chat"}
        >
          {chatPanelOpen ? (
            <PanelRightClose size={18} />
          ) : (
            <PanelRightOpen size={18} />
          )}
        </button>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-xs">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-bg-app transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

// --- Live Ticker ---

interface AuditRow {
  id: string;
  actor: "user" | "agent";
  agent_name: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const MAX_TICKER_EVENTS = 20;

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEvent(row: AuditRow): string {
  const verb = formatAction(row.action);
  const name =
    row.metadata &&
    (typeof row.metadata.name === "string"
      ? row.metadata.name
      : typeof row.metadata.line_name === "string"
        ? row.metadata.line_name
        : null);
  const suffix = name ? ` "${name}"` : "";

  if (row.actor === "agent") {
    return `MESkit — ${verb}${suffix}`;
  }
  return `You — ${verb}${suffix}`;
}

export function LiveTicker() {
  const [events, setEvents] = useState<AuditRow[]>([]);

  useEffect(() => {
    const supabase = createClient();

    // Fetch recent events on mount
    supabase
      .from("audit_log")
      .select("id, actor, agent_name, action, entity_type, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_TICKER_EVENTS)
      .then(({ data }) => {
        if (data) setEvents(data.reverse() as AuditRow[]);
      });

    // Subscribe to new inserts
    const channel = supabase
      .channel("live-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const row = payload.new as AuditRow;
          setEvents((prev) => [...prev.slice(-(MAX_TICKER_EVENTS - 1)), row]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const latest = events[events.length - 1];

  return (
    <footer className="h-8 bg-bg-surface border-t border-border flex items-center px-4 shrink-0 overflow-hidden">
      {latest ? (
        <>
          {latest.actor === "agent" ? (
            <span className="w-4 h-4 rounded-full bg-agent/10 flex items-center justify-center shrink-0 mr-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-agent" />
            </span>
          ) : (
            <MessageSquare size={14} className="text-accent mr-2 shrink-0" />
          )}
          <p className="text-xs text-text-secondary font-mono truncate">
            {formatEvent(latest)}
          </p>
          {events.length > 1 && (
            <span className="ml-auto text-[10px] text-text-secondary/50 font-mono shrink-0">
              {events.length} events
            </span>
          )}
        </>
      ) : (
        <>
          <MessageSquare size={14} className="text-text-secondary mr-2 shrink-0" />
          <p className="text-xs text-text-secondary font-mono truncate">
            Ready — waiting for events...
          </p>
        </>
      )}
    </footer>
  );
}
