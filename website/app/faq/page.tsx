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
    'MESkit FAQ: concise answers about AI-native architecture, ISA-95 support, agent capabilities, roadmap status, and MQTT integration path.',
  path: '/faq',
  keywords: [
    'MESkit FAQ',
    'what is AI-native MES',
    'MESkit agents',
    'ISA-95 support',
    'MES MQTT integration',
    'agent-augmented MES',
    'MESkit North Star',
  ],
});

const breadcrumbs = [{ name: 'FAQ', path: '/faq' }];

const faqEntries = [
  {
    question: 'What is MESkit?',
    answer:
      'MESkit is the AI-Native MES — an open-source Manufacturing Execution System toolkit aligned to the ISA-95 standard. It provides 20+ typed tool operations backed by 12 ISA-95-mapped Postgres tables, with three specialized AI agents that share the same tool layer as the UI. Built on Next.js, Supabase, and Claude API tool-use under the MIT license.',
  },
  {
    question: 'What is an AI-native MES?',
    answer:
      'An AI-native MES routes both UI actions and AI agent commands through the same typed operational interface — one source of execution logic, validation, and audit trail. This is different from AI-enhanced systems where AI is bolted onto an existing stack. In MESkit, every button has a voice equivalent and every voice command follows the same guardrails as a button click.',
  },
  {
    question: 'What is MESkit\'s North Star?',
    answer:
      'Predict a machine failure and coordinate the shop floor response before it happens — agents handle detection, planning, and execution while operators stay in command. Three AI layers build toward this: the Sentinel (Anomaly Monitor) detects degradation from sensor telemetry, the Strategist (Production Planner) evaluates constraints and computes alternatives, and the Executor (Agent Runtime) acts through the tool layer. In the MVP these layers operate independently; post-MVP they close the coordination loop.',
  },
  {
    question: 'Does MESkit support ISA-95?',
    answer:
      'Yes. MESkit maps ISA-95 concepts directly into 12 Postgres tables: physical assets (lines, workstations, machines), product definitions (part_numbers, bom_entries, routes, route_steps), execution state (units, unit_history), and quality tracking (quality_events, defect_codes). Agents operate at ISA-95 Level 3, the same coordination layer as human operators.',
  },
  {
    question: 'What AI agents does MESkit include?',
    answer:
      'MESkit ships with three specialized agents: the Operator Assistant (chat-triggered, always available for WIP, movement, and quality logging), the Quality Analyst (event-driven, activated by yield thresholds below 90%, defect clusters, or elevated scrap), and the Production Planner (on-demand chat for capacity analysis and shift-level planning).',
  },
  {
    question: 'How do MESkit agents work?',
    answer:
      'Agents use Claude tool-use to select from 20+ registered tool operations, validate input against Zod schemas, and execute against Supabase. The agent runtime forwards context (current mode, selected line, related IDs) so tool selection is grounded in real MES state. If validation fails, the call is rejected with no state mutation.',
  },
  {
    question: 'Is MESkit production-ready or simulation-only today?',
    answer:
      'MESkit is in pre-M1 implementation with a finalized architecture and public six-milestone roadmap (M1 scaffold through M6 MQTT integration). The simulation-first model lets teams validate line flow and quality thresholds before connecting real hardware, reducing pilot failure risk.',
  },
  {
    question: 'How does MESkit integrate with MQTT?',
    answer:
      'MQTT integration is planned for milestone M6 using broker topics following the convention meskit/{line_id}/{workstation_id}/{event_type}. A Supabase Edge Function validates and bridges MQTT payloads into Postgres, feeding the same tool layer used by simulation. No business logic rewrites are needed when transitioning from simulation to live device streams.',
  },
  {
    question: 'Can I control MESkit with natural language?',
    answer:
      'Yes. Natural-language commands are interpreted by agents and translated into explicit tool calls such as move_unit, get_wip_status, and create_quality_event. Each call is schema-validated before execution, and the full tool chain is visible in the conversation timeline for auditability.',
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
                  <Link href="/agents">Agents and tool-call architecture</Link>
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
