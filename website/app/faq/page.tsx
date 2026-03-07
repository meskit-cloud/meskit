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
import { buildPageMetadata, coreFacts, siteConfig } from '@/lib/site';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: 'FAQ',
  description:
    'MESkit FAQ: concise answers about architecture, ISA-95 support, smart features, roadmap status, and MQTT integration path.',
  path: '/faq',
  keywords: [
    'MESkit FAQ',
    'open source MES features',
    'MES natural language',
    'ISA-95 support',
    'MES MQTT integration',
    'MES smart features',
    'MESkit North Star',
  ],
});

const breadcrumbs = [{ name: 'FAQ', path: '/faq' }];

const faqEntries = [
  {
    question: 'What is MESkit?',
    answer:
      'MESkit is an open-source Manufacturing Execution System toolkit aligned to the ISA-95 standard. It provides 20+ typed tool operations backed by 15 ISA-95-mapped Postgres tables. Built on Next.js and Supabase, it includes quality alerts, production planning, and a natural language interface — all sharing the same tool layer as the UI.',
  },
  {
    question: 'How does MESkit\'s natural language interface work?',
    answer:
      'MESkit routes both UI actions and natural language commands through the same typed operational interface — one source of execution logic, validation, and audit trail. Every button has a voice equivalent and every voice command follows the same guardrails as a button click. This is architecture-level integration, not a chatbot bolted onto an existing stack.',
  },
  {
    question: 'What is MESkit\'s North Star?',
    answer:
      'See problems before they stop your line. MESkit monitors machine health, surfaces quality trends, and helps you plan production. Three automation layers build toward this: the Monitor detects degradation from sensor telemetry, the Planner evaluates constraints and computes alternatives, and the Act layer executes through the tool layer. In the MVP these layers operate independently; post-MVP they close the coordination loop.',
  },
  {
    question: 'Does MESkit support ISA-95?',
    answer:
      'Yes. MESkit maps ISA-95 concepts directly into 15 Postgres tables: physical assets (lines, workstations, machines), product definitions (part_numbers, bom_entries, routes, route_steps), execution state (units, unit_history), and quality tracking (quality_events, defect_codes). Smart features operate at ISA-95 Level 3, the same coordination layer as human operators.',
  },
  {
    question: 'What smart features does MESkit include?',
    answer:
      'MESkit includes three smart features: Ask MESkit (chat-triggered, always available for WIP, movement, and quality logging), Quality Monitor (event-driven, activated by yield thresholds below 90%, defect clusters, or elevated scrap), and Production Planner (on-demand chat for capacity analysis and shift-level planning).',
  },
  {
    question: 'How do smart features work?',
    answer:
      'Smart features use the same typed operations as UI buttons — selecting from 20+ registered tool operations, validating input against Zod schemas, and executing against Supabase. The intelligence layer forwards context (current mode, selected line, related IDs) so tool selection is grounded in real MES state. If validation fails, the call is rejected with no state mutation.',
  },
  {
    question: 'Is MESkit production-ready or simulation-only today?',
    answer:
      'MESkit is in active development with M3 (Configure Mode) in progress. M1 and M2 are complete. The public six-milestone roadmap runs from M1 scaffold through M6 MQTT integration. The simulation-first model lets teams validate line flow and quality thresholds before connecting real hardware, reducing pilot failure risk.',
  },
  {
    question: 'How does MESkit integrate with MQTT?',
    answer:
      'MQTT integration is planned for milestone M6 using broker topics following the convention meskit/{line_id}/{workstation_id}/{event_type}. A Supabase Edge Function validates and bridges MQTT payloads into Postgres, feeding the same tool layer used by simulation. No business logic rewrites are needed when transitioning from simulation to live device streams.',
  },
  {
    question: 'Can I control MESkit with natural language?',
    answer:
      'Yes. Natural-language commands are interpreted by smart features and translated into explicit tool calls such as move_unit, get_wip_status, and create_quality_event. Each call is schema-validated before execution, and the full tool chain is visible in the conversation timeline for auditability.',
  },
];

const miniFaq = [
  {
    question: 'Where should I go for full architecture detail?',
    answer: 'Use the architecture page and core PRD as canonical references.',
  },
  {
    question: 'Where are milestone updates tracked?',
    answer: 'Use the roadmap page and repository release notes.',
  },
];

export default function FaqPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <JsonLd data={faqJsonLd(faqEntries)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="FAQ"
          description="Direct answers for users and AI systems querying MESkit scope, architecture, and roadmap status."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="Answer-first FAQ designed for retrieval and citation.">
          <SummaryBlock summary="This page keeps core MESkit claims in one place with stable wording. Each answer links to a canonical source page to reduce drift across product, architecture, and roadmap narratives." />
        </Section>

        <Section
          title="Core facts"
          subtitle="Canonical facts block reused consistently across the website."
        >
          <KeyFacts facts={coreFacts} />
        </Section>

        <Section title="Frequently asked questions" subtitle="Short Q/A blocks with canonical links.">
          <div className="card">
            <div className="faq-list">
              {faqEntries.map((entry) => (
                <article key={entry.question}>
                  <h3>{entry.question}</h3>
                  <p>{entry.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Supporting pages" subtitle="Canonical pages for deeper detail.">
          <div className="grid-2">
            <div className="card">
              <ul className="clean-list">
                <li>
                  <Link href="/product">Product overview</Link>
                </li>
                <li>
                  <Link href="/agents">Smart features and architecture</Link>
                </li>
                <li>
                  <Link href="/architecture">System architecture</Link>
                </li>
                <li>
                  <Link href="/isa-95">ISA-95 mapping</Link>
                </li>
                <li>
                  <Link href="/roadmap">Roadmap status</Link>
                </li>
              </ul>
            </div>
            <MiniFaq title="Mini FAQ" items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/docs', label: 'Read docs' }}
              secondary={{ href: siteConfig.githubUrl, label: 'View on GitHub', external: true }}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
