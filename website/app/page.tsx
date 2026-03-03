import Link from 'next/link';

import {
  CtaRow,
  KeyFacts,
  MiniFaq,
  Section,
  SummaryBlock,
} from '@/components/page-elements';
import { JsonLd } from '@/components/json-ld';
import { buildPageMetadata, coreFacts, siteConfig } from '@/lib/site';
import { howToJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: 'The AI-Native MES',
  description:
    'The AI-Native MES. Open-source, ISA-95 aligned MES toolkit where UI actions and AI agents run through the same typed tool layer.',
  path: '/',
  keywords: [
    'AI-native MES',
    'open source MES',
    'ISA-95 MES',
    'manufacturing AI agents',
    'autonomous MES',
    'simulation-first MES',
  ],
});

const homeFaq = [
  {
    question: 'What is MESkit?',
    answer:
      'MESkit is the AI-Native MES — an open-source Manufacturing Execution System toolkit aligned to the ISA-95 standard. It routes both human UI actions and AI agent commands through a single typed tool layer — 20+ Zod-validated server actions backed by 12 ISA-95-mapped Postgres tables. Built on Next.js, Supabase, and Claude API tool-use, MESkit ships with three specialized agents (Operator Assistant, Quality Analyst, Production Planner) and a North Star vision of autonomous predictive rescheduling.',
  },
  {
    question: 'How do agents work in MESkit?',
    answer:
      'MESkit agents use Claude tool-use to call the same typed operations as UI buttons. When a user gives a natural-language command, the agent runtime selects from registered tools, validates input against Zod schemas, and executes against Supabase. Every button has a voice equivalent, and every voice command follows the same guardrails as a button click.',
  },
  {
    question: 'Is MESkit production-ready today?',
    answer:
      'MESkit has completed M1 (project scaffold and tool layer) and is actively building M2 (Build Mode and Operator Assistant). Shop floor tools and the chat-driven agent are functional. The public six-milestone roadmap (M1 through M6) tracks progress toward full production readiness, with the simulation-first model letting teams validate line flow before connecting real hardware via MQTT in M6.',
  },
];

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MESkit',
  url: siteConfig.url,
  description: siteConfig.description,
};

const howToSteps = [
  { name: 'Define product', text: 'Create part numbers and BOM entries for the products to be manufactured.' },
  { name: 'Build route', text: 'Define route steps that map each product to workstations and operations in sequence.' },
  { name: 'Move units', text: 'Generate serial-numbered units and move them through route steps, tracking WIP in real time.' },
  { name: 'Collect data', text: 'Log quality events, pass/fail results, and defect codes at each workstation.' },
  { name: 'Visualize', text: 'Monitor throughput, yield, and unit traceability from dashboards tied to the same tool-layer data.' },
];

export default function HomePage() {
  return (
    <div className="page">
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={howToJsonLd({ name: 'How to set up MESkit', description: 'Step-by-step guide to defining products, building routes, moving units, collecting quality data, and monitoring execution in MESkit.', steps: howToSteps })} />
      <div className="container">
        <header className="page-intro">
          <p className="eyebrow">Open-source MES toolkit</p>
          <h1>The AI-Native MES</h1>
          <p className="lead" style={{ fontSize: '1.18rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            An MES, but an Autonomous one.
          </p>
          <p className="lead" style={{ marginTop: '0.8rem' }}>
            ISA-95 aligned, simulation-first, and MQTT-ready. One typed tool layer for UI actions and
            AI agent commands. Three specialized agents that operate as peers to human operators.
          </p>
          <p className="updated">Last updated: {siteConfig.lastUpdated}</p>
          <div style={{ marginTop: '1.1rem' }}>
            <CtaRow
              primary={{ href: siteConfig.githubUrl, label: 'View on GitHub', external: true }}
              secondary={{ href: '/docs', label: 'Read docs' }}
            />
          </div>
        </header>

        <Section
          title="What is MESkit?"
          subtitle="The AI-Native MES — an MES, but an Autonomous one."
        >
          <SummaryBlock summary="MESkit is an open-source MES toolkit where AI agents and human operators execute the same typed manufacturing operations. Unlike traditional MES platforms where AI is bolted on as an afterthought, MESkit routes both UI actions and agent commands through one Zod-validated tool layer backed by an ISA-95-aligned Postgres schema. The result: every button has a voice equivalent, and every voice command follows the same guardrails as a button click." />
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Typed tool operations</td>
                  <td>20+ Zod-validated server actions</td>
                </tr>
                <tr>
                  <td>ISA-95-mapped tables</td>
                  <td>12 Postgres tables via Supabase</td>
                </tr>
                <tr>
                  <td>AI agents in scope</td>
                  <td>3 (Operator, Quality, Planner)</td>
                </tr>
                <tr>
                  <td>License</td>
                  <td>MIT (fully open source)</td>
                </tr>
                <tr>
                  <td>Roadmap milestones</td>
                  <td>6 (M1 scaffold through M6 MQTT)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="North Star"
          subtitle="The product vision MESkit is building toward."
        >
          <SummaryBlock summary="Predict a machine failure and reschedule the entire shop floor autonomously — before the failure happens, without human intervention." />
          <div className="grid-3" style={{ marginTop: '1rem' }}>
            <article className="card">
              <h3>Sentinel</h3>
              <p>
                The Anomaly Monitor detects degradation signals from sensor telemetry and outputs failure
                probability scores.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: 'var(--text-tertiary)' }}>
                Milestone M6
              </p>
            </article>
            <article className="card">
              <h3>Strategist</h3>
              <p>
                The Production Planner evaluates constraints — backlog, deadlines, alternative capacity — and
                computes rescheduling options.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: 'var(--text-tertiary)' }}>
                Milestone M5
              </p>
            </article>
            <article className="card">
              <h3>Executor</h3>
              <p>
                The Agent Runtime acts on decisions through the tool layer — updates schedules, notifies
                operators, adjusts production flow.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: 'var(--text-tertiary)' }}>
                Available from M1
              </p>
            </article>
          </div>
          <p style={{ marginTop: '0.8rem' }}>
            In the MVP, these layers operate independently. Post-MVP, the Sentinel triggers the Strategist,
            which triggers the Executor — closing the autonomous loop. See the{' '}
            <Link href="/roadmap">roadmap</Link> for milestone details.
          </p>
        </Section>

        <Section
          title="Core facts"
          subtitle="Canonical product facts for both human readers and AI answer engines."
        >
          <div className="grid-2">
            <KeyFacts facts={coreFacts} />
            <SummaryBlock summary="MESkit is built around a single operational contract: typed tools. UI screens and AI agents are peers that call those tools with schema-validated input, then persist to the same Supabase-backed ISA-95 model." />
          </div>
        </Section>

        <Section
          title="How it works"
          subtitle="The product loop is identical for UI-driven and chat-driven workflows."
        >
          <div className="flow-row" role="list" aria-label="MESkit core flow">
            {[
              'Define product',
              'Build route',
              'Move units',
              'Collect data',
              'Visualize',
              '...or tell the agent',
            ].map((step) => (
              <div key={step} className="flow-step" role="listitem">
                {step}
              </div>
            ))}
          </div>
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <div className="card">
              <h3>Human interface</h3>
              <p>
                Build, Configure, Run, and Monitor modes provide direct control over lines, routes, units,
                and analytics.
              </p>
            </div>
            <div className="card agent-border">
              <h3>Agent interface</h3>
              <p>
                The chat panel maps intent into explicit tool calls. Every agent response is grounded in
                real MES operations.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Agent example"
          subtitle="Illustrative chat flow: user intent becomes deterministic tool calls."
        >
          <div className="code-block agent-border">
            <div className="code-head">
              <span>Operator Assistant</span>
              <span>Example interaction</span>
            </div>
            <div className="code-body">
              <pre>{`User: Scrap SMX-00044, solder defect
→ search_units(serial_number='SMX-00044')
→ create_quality_event(unit_id=..., event_type='scrap', result='fail')
→ scrap_unit(unit_id=...)
Agent: SMX-00044 scrapped. Defect logged as critical.`}</pre>
            </div>
          </div>
        </Section>

        <Section
          title="One tool layer for UI and agents"
          subtitle="AI-native architecture means no split logic path."
        >
          <div className="diagram">
            <code>{`UI Buttons ───┐
              ├─> Tool Layer (typed + validated) ──> Supabase Postgres
AI Agents ───┘

Agent Runtime (Claude tool-use) reads and writes through the same tool contracts.`}</code>
          </div>
          <p style={{ marginTop: '0.8rem' }}>
            See the full architecture breakdown on the <Link href="/architecture">architecture page</Link>.
          </p>
        </Section>

        <Section
          title="ISA-95 credibility"
          subtitle="MESkit data structures keep standard manufacturing terms explicit."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ISA-95 level</th>
                  <th>MESkit concept</th>
                  <th>Tables</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Level 0-2</td>
                  <td>Physical assets</td>
                  <td>
                    <code>lines</code>, <code>workstations</code>, <code>machines</code>
                  </td>
                </tr>
                <tr>
                  <td>Level 3</td>
                  <td>Execution + quality</td>
                  <td>
                    <code>units</code>, <code>unit_history</code>, <code>quality_events</code>
                  </td>
                </tr>
                <tr>
                  <td>Future bridge</td>
                  <td>MQTT ingestion</td>
                  <td>
                    <code>mqtt_messages</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Architecture snapshot"
          subtitle="Four-layer design with a future MQTT transport bridge."
        >
          <div className="diagram">
            <code>{`Frontend (Next.js)
  ↓
Tool Layer (Server Actions + Zod)
  ↓
Agent Runtime (Claude tool-use)
  ↓
Supabase (Postgres, Auth, Realtime)
  ↓
MQTT Broker (M6)`}</code>
          </div>
        </Section>

        <Section title="FAQ quick answers" subtitle="Answer-ready blocks for common discovery prompts.">
          <div className="grid-2">
            <MiniFaq items={homeFaq} />
            <div className="card">
              <h3>Explore next</h3>
              <ul className="clean-list">
                <li>
                  <Link href="/product">Product overview and operating modes</Link>
                </li>
                <li>
                  <Link href="/agents">Agent profiles and tool-call chains</Link>
                </li>
                <li>
                  <Link href="/isa-95">ISA-95 mapping table</Link>
                </li>
                <li>
                  <Link href="/roadmap">Milestones M1-M6</Link>
                </li>
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <CtaRow
                  primary={{ href: '/agents', label: 'Meet the agents' }}
                  secondary={{ href: '/architecture', label: 'See the tool layer' }}
                />
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
