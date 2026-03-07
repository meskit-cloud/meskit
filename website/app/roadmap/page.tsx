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
  title: 'Roadmap',
  description:
    'Public MESkit roadmap from M1 to M6, including feature progression from natural language interface to predictive maintenance.',
  path: '/roadmap',
  keywords: [
    'MES roadmap',
    'MES feature roadmap',
    'MQTT MES timeline',
    'open source MES milestones',
  ],
});

const breadcrumbs = [{ name: 'Roadmap', path: '/roadmap' }];

const milestones = [
  {
    id: 'Pre-M1',
    title: 'Architecture and PRD baseline',
    status: 'completed',
    detail:
      'Core PRD, data model, tool catalog, and architecture decisions finalized as the baseline for execution.',
  },
  {
    id: 'M1',
    title: 'Project scaffold + tool layer',
    status: 'completed',
    detail:
      'Next.js shell, Supabase setup, auth, chat panel, Zustand stores, tool-layer architecture with stubs, agent runtime with streaming, and ISA-95 database schema — all complete.',
  },
  {
    id: 'M2',
    title: 'Build mode + Ask MESkit',
    status: 'progress',
    detail:
      'Shop floor tools (lines, workstations, machines) and natural language interface are functional via chat. Build Mode UI with CRUD panels and Realtime sync is next.',
  },
  {
    id: 'M3',
    title: 'Configure mode',
    status: 'planned',
    detail:
      'Part numbers, BOM, routes, and serial algorithm workflows available through both UI and chat.',
  },
  {
    id: 'M4',
    title: 'Run mode + Quality Monitor',
    status: 'planned',
    detail:
      'Unit generation, movement, quality events, and event-driven yield/defect monitoring alerts.',
  },
  {
    id: 'M5',
    title: 'Monitor mode + Production Planner',
    status: 'planned',
    detail:
      'Live dashboards, traceability, and on-demand capacity planning through planner tool-use.',
  },
  {
    id: 'M6',
    title: 'MQTT interface + Machine Health Monitor',
    status: 'planned',
    detail:
      'Broker bridge, validated device ingestion, and sensor anomaly detection for predictive maintenance.',
  },
] as const;

const facts = [
  'Roadmap covers six milestones plus a completed pre-M1 baseline phase.',
  'Feature progression: M2 Ask MESkit, M4 Quality Monitor, M5 Planner, M6 Machine Health Monitor.',
  'M1 is complete. M2 is in progress — shop floor tools and Ask MESkit are functional.',
  'Architecture and PRD are canonical references for scope checks.',
];

const miniFaq = [
  {
    question: 'Which milestone introduces chat-driven operations?',
    answer: 'M2 with Ask MESkit integrated into Build Mode workflows.',
  },
  {
    question: 'When does MQTT ingestion arrive?',
    answer: 'M6 introduces MQTT broker integration and edge-function bridging.',
  },
  {
    question: 'Where can I follow changes?',
    answer: 'Use the roadmap, docs entry page, and repository changelog when releases are published.',
  },
];

function statusClass(status: 'completed' | 'planned' | 'progress') {
  if (status === 'completed') return 'status-badge status-completed';
  if (status === 'progress') return 'status-badge status-progress';
  return 'status-badge status-planned';
}

function statusLabel(status: 'completed' | 'planned' | 'progress') {
  if (status === 'completed') return 'Completed';
  if (status === 'progress') return 'In progress';
  return 'Planned';
}

export default function RoadmapPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="Roadmap"
          description="Public milestone path from foundation to MQTT-enabled operations. Scope and timing follow the core PRD and roadmap documents."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="Current state and direction.">
          <SummaryBlock summary="MESkit roadmap starts from a completed architecture baseline (pre-M1) and advances through M1-M6. M1 (scaffold + tool layer) is complete. M2 (Build Mode + Ask MESkit) is in progress with shop floor tools and the natural language interface functional via chat. Each milestone adds production capability while preserving the same tool-layer contract for UI and smart features." />
        </Section>

        <Section title="Milestone timeline" subtitle="Explicit statuses with feature deliverables highlighted.">
          <div className="timeline">
            {milestones.map((milestone) => (
              <article className="timeline-item" key={milestone.id}>
                <div className="timeline-head">
                  <h3>
                    {milestone.id}: {milestone.title}
                  </h3>
                  <span className={statusClass(milestone.status)}>{statusLabel(milestone.status)}</span>
                </div>
                <p>{milestone.detail}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Feature progression" subtitle="How smart features evolve across milestones.">
          <div className="grid-2">
            <div className="card">
              <h3>Progression path</h3>
              <ul className="clean-list">
                <li>
                  <code>M1</code>: runtime scaffolding — <strong>done</strong>.
                </li>
                <li>
                  <code>M2</code>: Ask MESkit — <strong>active</strong>.
                </li>
                <li>
                  <code>M4</code>: Quality Monitor active.
                </li>
                <li>
                  <code>M5</code>: Production Planner active.
                </li>
                <li>
                  <code>M6</code>: Machine Health Monitor planned.
                </li>
              </ul>
            </div>
            <div className="card agent-border">
              <h3>Why this order</h3>
              <p>
                The roadmap introduces execution-first smart feature support before predictive workflows. This keeps
                operational trust anchored to explicit tool outcomes and measurable production metrics.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="Answer-ready timeline context.">
          <div className="grid-2">
            <KeyFacts facts={facts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/blog', label: 'Read roadmap explainers' }}
              secondary={{ href: '/docs', label: 'Open docs entry' }}
            />
          </div>
        </Section>

        <Section title="Canonical links" subtitle="Roadmap support references.">
          <div className="card">
            <ul className="clean-list">
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  Repository releases and changelog (when available)
                </a>
              </li>
              <li>
                <Link href="/architecture">Architecture baseline</Link>
              </li>
              <li>
                <Link href="/agents">Smart feature details</Link>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
