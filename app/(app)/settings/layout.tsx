"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { KeyRound, Building2, Users, Factory } from "lucide-react";

const navItems = [
  { label: "API Keys", href: "/settings", icon: KeyRound },
  { label: "Organization", href: "/settings/org", icon: Building2 },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Plants", href: "/settings/plants", icon: Factory },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <nav className="w-52 shrink-0 border-r border-border bg-bg-surface p-4">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-2">
          Settings
        </h2>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/settings"
                ? pathname === "/settings"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-text-secondary hover:bg-bg-app hover:text-text-primary"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
