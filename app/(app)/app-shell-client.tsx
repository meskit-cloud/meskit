"use client";

import { Sidebar, TopBar, LiveTicker } from "@/components/app-shell";
import { ChatPanel } from "@/components/chat-panel";
import { QualityMonitorProvider } from "@/components/quality-monitor-provider";
import { OnboardingProvider } from "@/components/onboarding-provider";

export function AppShellClient({
  children,
  userEmail,
  userCreatedAt,
  role = "owner",
  orgName,
}: {
  children: React.ReactNode;
  userEmail: string;
  userCreatedAt: string;
  role?: "owner" | "admin" | "operator" | "viewer";
  orgName?: string;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <OnboardingProvider />
      <QualityMonitorProvider />
      <TopBar userEmail={userEmail} userCreatedAt={userCreatedAt} orgName={orgName} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={role} />

        <main className="flex-1 overflow-hidden">{children}</main>

        <ChatPanel />
      </div>

      <LiveTicker />
    </div>
  );
}
