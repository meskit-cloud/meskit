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
import { breadcrumbJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: 'Architecture',
  description:
    'MESkit architecture: frontend, shared tool layer, agent runtime, Supabase backend, and MQTT-ready transport model.',
  path: '/architecture',
  keywords: [
    'MES architecture',
    'MES tool layer',
    'Supabase manufacturing stack',
    'MES MQTT integration',
  ],
});

const breadcrumbs = [{ name: 'Architecture', path: '/architecture' }];

const facts = [
  'Frontend uses Next.js App Router with SSR/SSG-friendly rendering.',
  'Tool layer is the single source of truth for UI and agents.',
  'Agent runtime uses Claude tool-use with explicit tool registration.',
  'Supabase provides Postgres, auth, realtime, and edge functions.',
  'MQTT bridge is planned for milestone M6 using the same operational contracts.',
];

const miniFaq = [
  {
    question: 'Why is the tool layer central?',
    answer: 'It prevents business logic drift between UI handlers and agent actions.',
  },
  {
    question: 'Does MQTT require a separate logic stack?',
    answer:
      'No. MQTT changes transport, while execution remains on the same validated tool functions.',
  },
  {
    question: 'Where are realtime updates handled?',
    answer: 'Supabase Realtime subscriptions push state updates to connected clients and triggers.',
  },
];

export default function ArchitecturePage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="Architecture"
          description="MESkit uses a four-layer architecture that keeps operations typed, auditable, and reusable across interfaces. The same tool layer powers UI interactions, agent tool-use, and future MQTT ingestion paths."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="Design principle: one operation path, multiple interfaces.">
          <SummaryBlock summary="UI clicks and natural-language commands both resolve to typed tool functions. Those functions validate inputs and execute against Supabase-backed ISA-95 tables. Agent runtime logic and transport layers remain composable around that stable core." />
        </Section>

        <Section title="Four-layer design" subtitle="Current stack plus planned device transport.">
          <div className="diagram">
            <code>{`┌──────────────────────────────────────────────────────────┐
│ Frontend (Next.js App Router, responsive UI shell)      │
├──────────────────────────────────────────────────────────┤
│ Tool Layer (Server Actions + Zod validation)            │
│ UI calls tools • Agents call tools • same interfaces    │
├──────────────────────────────────────────────────────────┤
│ Agent Runtime (Claude tool-use)                         │
│ Operator Assistant • Quality Analyst • Planner          │
├──────────────────────────────────────────────────────────┤
│ Supabase (Postgres + Auth + Realtime + Edge Functions)  │
├──────────────────────────────────────────────────────────┤
│ MQTT Broker (M6) → Edge Function bridge                 │
└──────────────────────────────────────────────────────────┘`}</code>
          </div>
        </Section>

        <Section title="Tool layer rationale" subtitle="Single source of truth for operations.">
          <div className="grid-3">
            <article className="card">
              <h3>Type safety</h3>
              <p>
                Every tool contract is schema-validated before touching persistence, regardless of caller.
              </p>
            </article>
            <article className="card">
              <h3>Testability</h3>
              <p>
                Business logic is isolated in functions that can be tested without UI rendering or model
                prompts.
              </p>
            </article>
            <article className="card">
              <h3>Auditability</h3>
              <p>
                Tool-level call traces provide clear accountability for user and agent actions.
              </p>
            </article>
          </div>
        </Section>

        <Section title="Agent runtime" subtitle="Claude tool-use with explicit constraints.">
          <div className="grid-2">
            <div className="card">
              <h3>Runtime behavior</h3>
              <ul className="clean-list">
                <li>Injects mode and context before tool selection.</li>
                <li>Accepts model-selected tool calls only from registered definitions.</li>
                <li>Streams tool results back into assistant responses.</li>
              </ul>
            </div>
            <div className="code-block agent-border">
              <div className="code-head">
                <span>Example flow</span>
                <span>Claude tool-use</span>
              </div>
              <div className="code-body">
                <pre>{`Prompt → tool selection → schema validation
→ execution against Supabase
→ structured result
→ final assistant response`}</pre>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Supabase and MQTT transition" subtitle="Stable operational contracts across transport shifts.">
          <div className="grid-2">
            <article className="card">
              <h3>Why Supabase</h3>
              <ul className="clean-list">
                <li>Postgres relational model aligns with ISA-95 tables.</li>
                <li>Realtime channels support dashboards and event triggers.</li>
                <li>Auth and edge functions reduce initial infrastructure overhead.</li>
              </ul>
            </article>
            <article className="card">
              <h3>MQTT bridge design</h3>
              <ul className="clean-list">
                <li>
                  Topic pattern: <code>meskit/{'{line_id}'}/{'{workstation_id}'}/{'{event_type}'}</code>
                </li>
                <li>Gateway validates payloads and writes to Postgres.</li>
                <li>Downstream behavior continues through existing tool logic.</li>
              </ul>
            </article>
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="Answer-ready architecture summary.">
          <div className="grid-2">
            <KeyFacts facts={facts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/agents', label: 'Meet the agents' }}
              secondary={{ href: '/docs', label: 'Read docs' }}
            />
          </div>
        </Section>

        <Section title="Canonical links" subtitle="Supporting technical pages.">
          <div className="card">
            <ul className="clean-list">
              <li>
                <Link href="/agents">Agents: runtime and call-chain examples</Link>
              </li>
              <li>
                <Link href="/isa-95">ISA-95 mapping and terminology table</Link>
              </li>
              <li>
                <Link href="/roadmap">Roadmap milestones and transport progression</Link>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
