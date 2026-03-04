import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import {
  Breadcrumbs,
  CtaRow,
  KeyFacts,
  MiniFaq,
  PageIntro,
  Section,
  SummaryBlock,
} from '@/components/page-elements';
import { buildPageMetadata, siteConfig } from '@/lib/site';
import { breadcrumbJsonLd, definedTermJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: 'AI agents',
  description:
    'MESkit AI agents: Operator Assistant, Quality Analyst, and Production Planner. Learn how tool-use connects agents and UI through one typed tool layer.',
  path: '/agents',
  keywords: [
    'AI agents manufacturing',
    'AI-native MES',
    'MES with AI',
    'MES tool layer',
    'Claude tool-use manufacturing',
  ],
});

const breadcrumbs = [{ name: 'Agents', path: '/agents' }];

const facts = [
  '3 specialized agents share 20+ typed tool operations with the UI.',
  'Operator Assistant is chat-triggered with access to all shop-floor tools.',
  'Quality Analyst triggers on yield below 90%, defect clusters, or elevated scrap.',
  'Production Planner analyzes capacity across routes and shift windows.',
  'Three AI layers (Sentinel, Strategist, Executor) build toward agent-driven predictive rescheduling.',
  'All agent actions are Zod-validated — no hidden APIs or uncontrolled authority.',
];

const miniFaq = [
  {
    question: 'What makes MESkit agents different from chatbot add-ons?',
    answer:
      'Agents call operational MES tools directly with schema validation and explicit side effects.',
  },
  {
    question: 'Can an agent act outside the tool layer?',
    answer: 'No. Agent operations are constrained to registered tool contracts.',
  },
  {
    question: 'Which agent is event-driven in MVP scope?',
    answer: 'Quality Analyst, triggered by yield and defect thresholds.',
  },
];

export default function AgentsPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <JsonLd data={definedTermJsonLd([
        { name: 'AI-native MES', description: 'A Manufacturing Execution System where AI agents and human operators execute the same typed manufacturing operations through a shared tool layer.' },
        { name: 'Tool layer', description: 'A set of Zod-validated server actions that serve as the single execution interface for both UI interactions and AI agent commands in MESkit.' },
        { name: 'Agent runtime', description: 'The Claude tool-use runtime that maps natural-language intent to explicit, schema-validated MES tool calls.' },
      ])} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="AI agents"
          description="MESkit ships with specialized AI operators that act through the same typed tool layer as the UI. This is architecture-level AI-native behavior, not a bolted-on chat wrapper."
          updated={siteConfig.lastUpdated}
        />

        <Section title="What AI-native MES means" subtitle="Tool layer first, chat interface second.">
          <SummaryBlock summary="In MESkit, AI capability is defined by tool contracts. The Operator Assistant, Quality Analyst, and Production Planner use the same operations used by UI buttons. This keeps behavior consistent, testable, and auditable." />
        </Section>

        <Section title="Three AI layers" subtitle="The architecture behind agent-augmented manufacturing.">
          <SummaryBlock summary="MESkit agents are designed around three complementary roles that, together, deliver the North Star: predict a machine failure and coordinate the shop floor response — agents handle detection, planning, and execution while operators stay in command." />
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Role</th>
                  <th>Agent</th>
                  <th>Milestone</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Sentinel</strong></td>
                  <td>Monitors sensor telemetry, detects degradation, outputs failure probability scores</td>
                  <td>Anomaly Monitor</td>
                  <td>M6</td>
                </tr>
                <tr>
                  <td><strong>Strategist</strong></td>
                  <td>Evaluates constraints (backlog, deadlines, capacity), computes alternative schedules</td>
                  <td>Production Planner</td>
                  <td>M5</td>
                </tr>
                <tr>
                  <td><strong>Executor</strong></td>
                  <td>Acts on decisions through the tool layer — updates schedules, notifies operators</td>
                  <td>Agent Runtime</td>
                  <td>M1+</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.8rem' }}>
            In the MVP, these layers operate independently. Post-MVP, the Sentinel triggers the Strategist,
            which triggers the Executor — closing the coordination loop.
          </p>
        </Section>

        <Section title="Agent profiles" subtitle="Roles, triggers, and tool access by design.">
          <div className="grid-3">
            <article className="card agent-border">
              <h3>Operator Assistant</h3>
              <p>
                Trigger: chat, always available. Role: conversational co-pilot for WIP, movement, and
                quality logging.
              </p>
              <ul className="clean-list" style={{ marginTop: '0.8rem' }}>
                <li>
                  Uses tools such as <code>get_wip_status</code>, <code>move_unit</code>,{' '}
                  <code>create_quality_event</code>.
                </li>
                <li>Can execute Build, Configure, and Run operations through natural language.</li>
              </ul>
            </article>
            <article className="card agent-border">
              <h3>Quality Analyst</h3>
              <p>
                Trigger: realtime threshold events. Role: proactive defect and yield monitoring with concise
                alerts.
              </p>
              <ul className="clean-list" style={{ marginTop: '0.8rem' }}>
                <li>Default triggers: yield below 90%, defect clusters, elevated scrap rate.</li>
                <li>
                  Uses read-heavy tools such as <code>get_yield_report</code> and{' '}
                  <code>get_unit_history</code>.
                </li>
              </ul>
            </article>
            <article className="card agent-border">
              <h3>Production Planner</h3>
              <p>
                Trigger: chat on demand. Role: capacity analysis, route comparisons, and shift-level planning.
              </p>
              <ul className="clean-list" style={{ marginTop: '0.8rem' }}>
                <li>
                  Uses tools such as <code>list_routes</code>, <code>get_throughput</code>,{' '}
                  <code>get_yield_report</code>.
                </li>
                <li>Translates production goals into constrained operational options.</li>
              </ul>
            </article>
          </div>
        </Section>

        <Section title="Shared tool layer architecture" subtitle="Same typed functions for button clicks and tool-use.">
          <div className="diagram">
            <code>{`Operator Assistant ─┐
Quality Analyst ────┼─> Agent Runtime (Claude tool-use)
Production Planner ─┘                │
                                     ▼
                             Tool Layer (Zod-validated)
                                     │
                                     ▼
                             Supabase (Postgres + Realtime)`}</code>
          </div>
          <p style={{ marginTop: '0.8rem' }}>
            Full rationale is documented on <Link href="/architecture">architecture</Link> and aligned with
            the core PRD.
          </p>
        </Section>

        <Section title="Concrete tool call chains" subtitle="User says X, agent calls Y, system returns Z.">
          <div className="grid-2">
            <div className="code-block agent-border">
              <div className="code-head">
                <span>Operator chain</span>
                <span>Run mode</span>
              </div>
              <div className="code-body">
                <pre>{`User: What's stuck at assembly?
→ get_wip_status(workstation_id='assembly')
Agent: 3 units waiting at Assembly.`}</pre>
              </div>
            </div>
            <div className="code-block agent-border">
              <div className="code-head">
                <span>Quality chain</span>
                <span>Event trigger</span>
              </div>
              <div className="code-body">
                <pre>{`Trigger: Yield < 90% at Station 3
→ get_yield_report(time_range='last_50_units')
→ get_unit_history(unit_ids=...)
Analyst: 6/7 failures are SOL-003.`}</pre>
              </div>
            </div>
            <div className="code-block agent-border">
              <div className="code-head">
                <span>Planner chain</span>
                <span>Capacity request</span>
              </div>
              <div className="code-body">
                <pre>{`User: Build 500 units by end of shift
→ list_routes(part_number_id=...)
→ get_throughput(line_id=..., time_range='8h')
Planner: Recommend parallel lines to hit target.`}</pre>
              </div>
            </div>
            <div className="card">
              <h3>Guardrails</h3>
              <ul className="clean-list">
                <li>All actions are bounded by registered tools and schema validation.</li>
                <li>Agents do not self-authorize critical actions outside user intent.</li>
                <li>Operator oversight remains mandatory for production decisions.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section
          title="AI-native vs traditional MES"
          subtitle="How the tool layer changes the integration model."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Traditional MES</th>
                  <th>AI-enhanced MES</th>
                  <th>AI-native MES (MESkit)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>AI integration</td>
                  <td>None</td>
                  <td>Sidecar / bolt-on</td>
                  <td>Shared tool layer</td>
                </tr>
                <tr>
                  <td>Execution path</td>
                  <td>UI only</td>
                  <td>UI + separate AI API</td>
                  <td>One path for UI and agents</td>
                </tr>
                <tr>
                  <td>Validation</td>
                  <td>Per-screen logic</td>
                  <td>Duplicated across layers</td>
                  <td>Single Zod schema per tool</td>
                </tr>
                <tr>
                  <td>Audit trail</td>
                  <td>UI actions logged</td>
                  <td>Partial AI logging</td>
                  <td>Full trace for both UI and agents</td>
                </tr>
                <tr>
                  <td>Natural language</td>
                  <td>Not supported</td>
                  <td>Chat wrapper</td>
                  <td>Maps to typed tool calls</td>
                </tr>
                <tr>
                  <td>Standards</td>
                  <td>Vendor-specific</td>
                  <td>Varies</td>
                  <td>ISA-95 aligned schema</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="GEO-friendly answer blocks.">
          <div className="grid-2">
            <KeyFacts facts={facts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/architecture', label: 'See the tool layer' }}
              secondary={{ href: '/docs', label: 'Read docs' }}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
