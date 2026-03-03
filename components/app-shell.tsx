"use client";

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
} from "lucide-react";
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
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              isActive
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-12 bg-bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-text-primary font-ui text-lg">
          MESkit
        </span>
        <span className="text-xs text-text-secondary font-mono bg-bg-app px-2 py-0.5 rounded">
          M1
        </span>
      </div>

      <div className="flex items-center gap-2">
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

export function LiveTicker() {
  return (
    <footer className="h-8 bg-bg-surface border-t border-border flex items-center px-4 shrink-0 overflow-hidden">
      <MessageSquare size={14} className="text-text-secondary mr-2 shrink-0" />
      <p className="text-xs text-text-secondary font-mono truncate">
        Ready — waiting for events...
      </p>
    </footer>
  );
}
