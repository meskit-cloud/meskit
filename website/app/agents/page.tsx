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
  title: 'Smart Features',
  description:
    'MESkit smart features: Ask MESkit, Quality Monitor, and Production Planner. Learn how the natural language interface and UI share one typed tool layer.',
  path: '/agents',
  keywords: [
    'MES smart features',
    'MES with natural language',
    'MES quality alerts',
    'MES tool layer',
    'natural language manufacturing',
  ],
});

const breadcrumbs = [{ name: 'Smart Features', path: '/agents' }];

const facts = [
  '3 specialized features share 20+ typed tool operations with the UI.',
  'Ask MESkit is chat-triggered with access to all shop-floor tools.',
  'Quality Monitor triggers on yield below 90%, defect clusters, or elevated scrap.',
  'Production Planner analyzes capacity across routes and shift windows.',
  'Three automation layers (Monitor, Plan, Act) build toward automated predictive rescheduling.',
  'All smart feature actions are Zod-validated — no hidden APIs or uncontrolled authority.',
];

const miniFaq = [
  {
    question: 'What makes MESkit smart features different from chatbot add-ons?',
    answer:
      'They call operational MES tools directly with schema validation and explicit side effects.',
  },
  {
    question: 'Can a smart feature act outside the tool layer?',
    answer: 'No. All operations are constrained to registered tool contracts.',
  },
  {
    question: 'Which feature is event-driven in MVP scope?',
    answer: 'Quality Monitor, triggered by yield and defect thresholds.',
  },
];

export default function AgentsPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <JsonLd data={definedTermJsonLd([
        { name: 'Open-source MES with natural language', description: 'A Manufacturing Execution System where smart features and human operators execute the same typed manufacturing operations through a shared tool layer.' },
        { name: 'Tool layer', description: 'A set of Zod-validated server actions that serve as the single execution interface for both UI interactions and smart feature commands in MESkit.' },
        { name: 'Intelligence layer', description: 'The runtime that maps natural-language intent to explicit, schema-validated MES tool calls.' },
      ])} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="Smart features"
          description="MESkit ships with smart features that act through the same typed tool layer as the UI. Natural language and automation are built into the architecture, not bolted on as a chat wrapper."
          updated={siteConfig.lastUpdated}
        />

        <Section title="How MESkit works" subtitle="Tool layer first, chat interface second.">
          <SummaryBlock summary="In MESkit, smart features are defined by tool contracts. Ask MESkit, Quality Monitor, and Production Planner use the same operations used by UI buttons. This keeps behavior consistent, testable, and auditable." />
        </Section>

        <Section title="Three automation layers" subtitle="The architecture behind automated manufacturing.">
          <SummaryBlock summary="MESkit smart features are designed around three complementary roles that, together, deliver the North Star: predict a machine failure and coordinate the shop floor response — automation handles detection, planning, and execution while operators stay in command." />
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Role</th>
                  <th>Feature</th>
                  <th>Milestone</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Monitor</strong></td>
                  <td>Monitors sensor telemetry, detects degradation, outputs failure probability scores</td>
                  <td>Machine Health Monitor</td>
                  <td>M6</td>
                </tr>
                <tr>
                  <td><strong>Plan</strong></td>
                  <td>Evaluates constraints (backlog, deadlines, capacity), computes alternative schedules</td>
                  <td>Production Planner</td>
                  <td>M5</td>
                </tr>
                <tr>
                  <td><strong>Act</strong></td>
                  <td>Acts on decisions through the tool layer — updates schedules, notifies operators</td>
                  <td>Intelligence Layer</td>
                  <td>M1+</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '0.8rem' }}>
            In the MVP, these layers operate independently. Post-MVP, Monitor triggers Plan,
            which triggers Act — closing the coordination loop.
          </p>
        </Section>

        <Section title="Feature profiles" subtitle="Roles, triggers, and tool access by design.">
          <div className="grid-3">
            <article className="card agent-border">
              <h3>Ask MESkit</h3>
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
              <h3>Quality Monitor</h3>
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
            <code>{`Ask MESkit ─────────┐
Quality Monitor ────┼─> Intelligence Layer
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
MESkit: 3 units waiting at Assembly.`}</pre>
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
Alert: 6/7 failures are SOL-003.`}</pre>
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
                <li>Smart features do not self-authorize critical actions outside user intent.</li>
                <li>Operator oversight remains mandatory for production decisions.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section
          title="MESkit vs traditional MES"
          subtitle="How the tool layer changes the integration model."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Traditional MES</th>
                  <th>AI-enhanced MES</th>
                  <th>MESkit</th>
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
                  <td>One path for UI and smart features</td>
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
                  <td>Full trace for both UI and smart features</td>
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
