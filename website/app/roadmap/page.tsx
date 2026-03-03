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
    'Public MESkit roadmap from M1 to M6, including agent progression from Operator Assistant to Anomaly Monitor.',
  path: '/roadmap',
  keywords: [
    'MES roadmap',
    'AI agents manufacturing roadmap',
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
    status: 'planned',
    detail:
      'Next.js shell, Supabase setup, auth, chat panel scaffold, and typed tool-layer foundations.',
  },
  {
    id: 'M2',
    title: 'Build mode + Operator Assistant',
    status: 'planned',
    detail:
      'CRUD for lines/workstations/machines via UI and chat, with realtime sync across clients.',
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
    title: 'Run mode + Quality Analyst',
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
    title: 'MQTT interface + Anomaly Monitor',
    status: 'planned',
    detail:
      'Broker bridge, validated device ingestion, and sensor anomaly detection agent activation.',
  },
] as const;

const facts = [
  'Roadmap covers six milestones plus a completed pre-M1 baseline phase.',
  'Agent progression: M2 Operator Assistant, M4 Quality Analyst, M5 Planner, M6 Anomaly Monitor.',
  'Current public status is pre-M1 completed; M1-M6 are planned.',
  'Architecture and PRD are canonical references for scope checks.',
];

const miniFaq = [
  {
    question: 'Which milestone introduces chat-driven operations?',
    answer: 'M2 with the Operator Assistant integrated into Build Mode workflows.',
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
          <SummaryBlock summary="MESkit roadmap starts from a completed architecture baseline (pre-M1) and advances through M1-M6. Each milestone adds production capability while preserving the same tool-layer contract for UI and agents." />
        </Section>

        <Section title="Milestone timeline" subtitle="Explicit statuses with agent deliverables highlighted.">
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

        <Section title="Agent progression" subtitle="How AI capabilities evolve across milestones.">
          <div className="grid-2">
            <div className="card">
              <h3>Progression path</h3>
              <ul className="clean-list">
                <li>
                  <code>M1</code>: runtime scaffolding only.
                </li>
                <li>
                  <code>M2</code>: Operator Assistant active.
                </li>
                <li>
                  <code>M4</code>: Quality Analyst active.
                </li>
                <li>
                  <code>M5</code>: Production Planner active.
                </li>
                <li>
                  <code>M6</code>: Anomaly Monitor planned.
                </li>
              </ul>
            </div>
            <div className="card agent-border">
              <h3>Why this order</h3>
              <p>
                The roadmap introduces execution-first agent support before predictive workflows. This keeps
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
                <Link href="/agents">Agent capability details</Link>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
