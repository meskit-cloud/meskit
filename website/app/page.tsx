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

export const metadata = buildPageMetadata({
  title: 'Open-source, AI-native MES toolkit',
  description:
    'MESkit is an ISA-95 aligned open-source MES toolkit where UI actions and AI agents run through the same typed tool layer.',
  path: '/',
  keywords: [
    'AI-native MES',
    'open source MES',
    'ISA-95 MES',
    'manufacturing AI agents',
    'simulation-first MES',
  ],
});

const homeFaq = [
  {
    question: 'What is MESkit?',
    answer:
      'MESkit is an open-source, AI-native MES toolkit aligned to ISA-95 with a simulation-first execution model.',
  },
  {
    question: 'How do agents work in MESkit?',
    answer:
      'Agents call the same typed tools as the UI. They do not bypass business logic or run on hidden APIs.',
  },
  {
    question: 'Is MESkit production-ready today?',
    answer:
      'Current status is pre-M1 implementation, with architecture and milestones defined publicly on the roadmap.',
  },
];

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MESkit',
  url: siteConfig.url,
  description: siteConfig.description,
};

export default function HomePage() {
  return (
    <div className="page">
      <JsonLd data={websiteJsonLd} />
      <div className="container">
        <header className="page-intro">
          <p className="eyebrow">AI-native manufacturing execution</p>
          <h1>AI-native MES for modern manufacturing teams</h1>
          <p className="lead">
            Open-source MES infrastructure built with clear standards and operational discipline. ISA-95
            aligned, simulation-first, and MQTT-ready, with one typed tool layer for UI actions and agent
            commands.
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
