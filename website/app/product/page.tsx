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
  title: 'Product overview',
  description:
    'MESkit product overview: Build, Configure, Run, Monitor workflows with an always-available chat interface using the same tool layer.',
  path: '/product',
  keywords: [
    'open source MES product',
    'manufacturing execution system open source',
    'MES operating modes',
    'chat-driven MES operations',
  ],
});

const breadcrumbs = [{ name: 'Product', path: '/product' }];

const modeCards = [
  {
    name: 'Build',
    detail: 'Create lines, workstations, and machine assignments with live state sync.',
  },
  {
    name: 'Configure',
    detail: 'Define part numbers, BOM entries, routes, and serial algorithms.',
  },
  {
    name: 'Run',
    detail: 'Generate units, move WIP, and log quality events with manual or chat control.',
  },
  {
    name: 'Monitor',
    detail: 'Track throughput, yield, and unit traceability from one dashboard.',
  },
];

const pageFacts = [
  'The UI and chat panel are parallel interfaces to one tool layer.',
  'MVP default production type is discrete manufacturing.',
  'Batch and continuous models are schema-ready and roadmap-scoped.',
  'All state-changing actions are explicit tool calls with validation.',
];

const miniFaq = [
  {
    question: 'Can I use MESkit without the natural language interface?',
    answer: 'Yes. The full UI workflow works independently of chat commands.',
  },
  {
    question: 'What does "every button has a voice equivalent" mean?',
    answer:
      'Core UI operations map to the same function signatures exposed to the natural language interface.',
  },
  {
    question: 'Are batch and continuous flows fully available in MVP?',
    answer:
      'No. MVP focuses on discrete workflows while keeping data contracts ready for expansion.',
  },
];

export default function ProductPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="Product overview"
          description="MESkit combines four operating modes with an always-available chat panel. Operators can work by clicking UI actions or issuing natural-language instructions that resolve to the same typed tool calls."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="How the product experience is structured.">
          <SummaryBlock summary="MESkit is a simulation-first MES experience that keeps operational logic centralized in the tool layer. Build and configure the factory model, run production movement and quality events, then monitor execution metrics in real time. Chat commands act as a second interface, not a separate capability." />
        </Section>

        <Section title="Four operating modes" subtitle="The UI mirrors real manufacturing progression.">
          <div className="grid-4">
            {modeCards.map((mode) => (
              <article className="card" key={mode.name}>
                <h3>{mode.name}</h3>
                <p>{mode.detail}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Chat panel as a parallel interface" subtitle="Same actions, different input style.">
          <div className="grid-2">
            <div className="card">
              <h3>UI example</h3>
              <ul className="clean-list">
                <li>Click <code>Move</code> on unit <code>SMX-00042</code>.</li>
                <li>UI calls <code>move_unit</code> with validated payload.</li>
                <li>Realtime update pushes to all connected clients.</li>
              </ul>
            </div>
            <div className="code-block agent-border">
              <div className="code-head">
                <span>Chat equivalent</span>
                <span>Ask MESkit</span>
              </div>
              <div className="code-body">
                <pre>{`User: Move SMX-00042 to the next station
→ search_units(serial_number='SMX-00042')
→ move_unit(unit_id=...)
MESkit: SMX-00042 moved to Station 3.`}</pre>
              </div>
            </div>
          </div>
        </Section>

        <Section title="MVP boundaries" subtitle="Current scope and planned expansion.">
          <div className="grid-2">
            <div className="card">
              <h3>In MVP</h3>
              <ul className="clean-list">
                <li>Discrete manufacturing flow with route-based unit progression.</li>
                <li>Ask MESkit in chat.</li>
                <li>Quality Monitor and Production Planner on roadmap milestones.</li>
                <li>Realtime dashboards and event logs tied to tool outputs.</li>
              </ul>
            </div>
            <div className="card">
              <h3>Planned after MVP</h3>
              <ul className="clean-list">
                <li>Full batch and continuous UX surfaces.</li>
                <li>MQTT transport bridge and anomaly monitor.</li>
                <li>Expanded planner scenarios and cross-line orchestration.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Who this is for" subtitle="Practical fit by user type.">
          <div className="grid-2">
            <article className="card">
              <h3>Manufacturing engineer</h3>
              <p>
                Validate ISA-95 concepts using concrete routes, unit history, and quality event timelines
                without enterprise license overhead.
              </p>
            </article>
            <article className="card">
              <h3>Small manufacturer</h3>
              <p>
                Start with simulation and explicit shop-floor workflows, then expand toward machine-fed
                execution using MQTT-ready contracts.
              </p>
            </article>
            <article className="card">
              <h3>Developer team</h3>
              <p>
                Use the reference stack to build programmable MES flows with typed tools and agent
                integration.
              </p>
            </article>
            <article className="card">
              <h3>AI exploration team</h3>
              <p>
                Test agent workflows grounded in real MES operations, not chat-only demos disconnected from
                execution logic.
              </p>
            </article>
          </div>
        </Section>

        <Section title="Key facts and FAQs" subtitle="Answer-ready structure for technical discovery.">
          <div className="grid-2">
            <KeyFacts facts={pageFacts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/agents', label: 'See smart features' }}
              secondary={{ href: '/roadmap', label: 'View roadmap' }}
            />
          </div>
        </Section>

        <Section title="Canonical links" subtitle="Supporting pages for deeper detail.">
          <div className="card">
            <ul className="clean-list">
              <li>
                <Link href="/agents">Smart features and tool-call examples</Link>
              </li>
              <li>
                <Link href="/architecture">Four-layer architecture and MQTT transition</Link>
              </li>
              <li>
                <Link href="/isa-95">ISA-95 mapping table and terminology</Link>
              </li>
              <li>
                <Link href="/docs">Docs entry and implementation references</Link>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
