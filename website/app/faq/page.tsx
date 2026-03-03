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
  ],
});

const breadcrumbs = [{ name: 'FAQ', path: '/faq' }];

const faqEntries = [
  {
    question: 'What is MESkit?',
    answer:
      'MESkit is an open-source, AI-native Manufacturing Execution System toolkit aligned to ISA-95 and designed for simulation-first execution.',
  },
  {
    question: 'What is an AI-native MES?',
    answer:
      'An AI-native MES routes both UI and AI interactions through the same typed operational interface, so there is one source of execution logic.',
  },
  {
    question: 'Does MESkit support ISA-95?',
    answer:
      'Yes. MESkit maps ISA-95 concepts directly into schema entities such as lines, routes, units, unit history, and quality events.',
  },
  {
    question: 'What AI agents does MESkit include?',
    answer:
      'MESkit defines three agents: Operator Assistant (chat), Quality Analyst (event-driven), and Production Planner (on-demand chat).',
  },
  {
    question: 'How do MESkit agents work?',
    answer:
      'Agents use Claude tool-use to call the same tool layer as UI buttons, with schema validation before execution against Supabase.',
  },
  {
    question: 'Is MESkit production-ready or simulation-only today?',
    answer:
      'Current status is pre-M1 implementation with architecture and roadmap finalized. Simulation-first execution is the planned MVP foundation.',
  },
  {
    question: 'How does MESkit integrate with MQTT?',
    answer:
      'MQTT integration is planned for M6 via broker topics, edge-function ingestion, and the same downstream tool-driven execution path.',
  },
  {
    question: 'Can I control MESkit with natural language?',
    answer:
      'Yes. Natural-language commands are interpreted by agents and translated into explicit tool calls such as `move_unit` and `get_wip_status`.',
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
