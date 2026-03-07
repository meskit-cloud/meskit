import Link from "next/link";
import {
  Hammer,
  Settings,
  Play,
  BarChart3,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-ui text-text-primary">
            Help
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Learn how to use MESkit — the AI-native Manufacturing Execution
            System.
          </p>
        </div>

        {/* Modes */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-ui text-text-primary">
            Modes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModeCard
              icon={<Hammer size={20} />}
              title="Build"
              href="/build"
              description="Create and manage your shop floor: manufacturing lines, workstations, and machines."
              tips={[
                "Use the left panel to create lines",
                "Select a line to manage its workstations",
                "Each workstation can have machines attached",
              ]}
            />
            <ModeCard
              icon={<Settings size={20} />}
              title="Configure"
              href="/configure"
              description="Define products, bills of materials, serial number algorithms, and manufacturing routes."
              tips={[
                "Create part numbers in the left panel",
                "Add BOM entries and serial config in the center",
                "Design routes with ordered steps in the right panel",
              ]}
            />
            <ModeCard
              icon={<Play size={20} />}
              title="Run"
              href="/run"
              description="Execute production — generate units, move WIP through routes, and track progress."
              tips={[
                "Start the simulator to generate production data",
                "Watch units flow through workstations in real time",
                "Quality gates check pass/fail at marked steps",
              ]}
            />
            <ModeCard
              icon={<BarChart3 size={20} />}
              title="Monitor"
              href="/monitor"
              description="View dashboards, analytics, OEE metrics, and quality trends."
              tips={[
                "Track throughput, yield, and machine status",
                "Drill into individual units and their history",
                "Quality alerts surface when yield drops",
              ]}
            />
          </div>
        </section>

        {/* Chat / Operator Assistant */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold font-ui text-text-primary flex items-center gap-2">
            <MessageSquare size={20} className="text-accent" />
            Operator Assistant
          </h2>
          <div className="bg-bg-surface border border-border rounded-lg p-4 space-y-3 text-sm text-text-secondary">
            <p>
              The chat panel on the right side gives you access to the Operator
              Assistant. It can perform every operation available in the UI
              through natural language.
            </p>
            <div>
              <p className="font-medium text-text-primary mb-1">
                Try these commands:
              </p>
              <ul className="space-y-1 font-mono text-xs">
                <li className="bg-bg-app rounded px-2 py-1">
                  &quot;Create a line called Assembly&quot;
                </li>
                <li className="bg-bg-app rounded px-2 py-1">
                  &quot;Add 3 workstations to Assembly&quot;
                </li>
                <li className="bg-bg-app rounded px-2 py-1">
                  &quot;Create part number Smartphone X&quot;
                </li>
                <li className="bg-bg-app rounded px-2 py-1">
                  &quot;Set serial prefix SMX with 5 digits&quot;
                </li>
                <li className="bg-bg-app rounded px-2 py-1">
                  &quot;List all part numbers&quot;
                </li>
              </ul>
            </div>
            <p>
              The assistant asks for confirmation before any delete or update
              operation. All agent actions appear in the live ticker at the
              bottom.
            </p>
          </div>
        </section>

        {/* Key concepts */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold font-ui text-text-primary">
            Key concepts
          </h2>
          <div className="bg-bg-surface border border-border rounded-lg p-4 text-sm text-text-secondary space-y-2">
            <Concept
              term="Line"
              definition="A manufacturing line — the top-level grouping for workstations."
            />
            <Concept
              term="Workstation"
              definition="A position on a line where work is performed. Workstations are ordered within a line."
            />
            <Concept
              term="Machine"
              definition="Physical equipment attached to a workstation (e.g., a solder station, a press)."
            />
            <Concept
              term="Part number"
              definition="A product definition — represents something you manufacture."
            />
            <Concept
              term="BOM"
              definition="Bill of Materials — the list of items (components) needed to build a part number."
            />
            <Concept
              term="Route"
              definition="An ordered sequence of steps a unit follows through workstations during production."
            />
            <Concept
              term="Serial algorithm"
              definition="Defines the prefix and digit count for auto-generated unit serial numbers."
            />
            <Concept
              term="Pass/fail gate"
              definition="A quality checkpoint on a route step — units are inspected here during production."
            />
          </div>
        </section>

        {/* Full docs link */}
        <section className="bg-bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Full documentation
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Detailed guides, tutorials, and API reference on the MESkit
              website.
            </p>
          </div>
          <a
            href="https://meskit.cloud/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline shrink-0"
          >
            meskit.cloud/docs
            <ExternalLink size={14} />
          </a>
        </section>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  href,
  description,
  tips,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  description: string;
  tips: string[];
}) {
  return (
    <Link
      href={href}
      className="bg-bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors block"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-accent">{icon}</span>
        <h3 className="font-semibold font-ui text-text-primary">{title}</h3>
      </div>
      <p className="text-xs text-text-secondary mb-2">{description}</p>
      <ul className="text-xs text-text-secondary space-y-0.5">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-1.5">
            <span className="text-accent mt-0.5 shrink-0">·</span>
            {tip}
          </li>
        ))}
      </ul>
    </Link>
  );
}

function Concept({
  term,
  definition,
}: {
  term: string;
  definition: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-text-primary shrink-0 w-28">
        {term}
      </span>
      <span>{definition}</span>
    </div>
  );
}
