"use client";

import { Sidebar, TopBar, LiveTicker } from "@/components/app-shell";
import { ChatPanel } from "@/components/chat-panel";

export function AppShellClient({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar userEmail={userEmail} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        <ChatPanel />
      </div>

      <LiveTicker />
    </div>
  );
}
