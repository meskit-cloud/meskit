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
  title: 'About',
  description:
    'MESkit mission and open-source positioning: standards-aligned manufacturing software with AI-native architecture.',
  path: '/about',
  keywords: ['about MESkit', 'open source manufacturing software', 'MESkit mission'],
});

const breadcrumbs = [{ name: 'About', path: '/about' }];

const facts = [
  'MESkit is positioned as an open-source reference implementation for modern MES architecture.',
  'Mission focus: practical ISA-95 alignment and programmable operations.',
  'AI-native claims are grounded in shared tool-layer design, not marketing abstraction.',
  'Community contribution and transparency are core project principles.',
];

const miniFaq = [
  {
    question: 'Is MESkit commercial software?',
    answer: 'MESkit is open-source and designed as a transparent, buildable toolkit.',
  },
  {
    question: 'Why focus on developers and engineers?',
    answer:
      'The project aims to bridge manufacturing standards with software implementation clarity.',
  },
];

export default function AboutPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="About MESkit"
          description="MESkit exists to make modern manufacturing execution architecture understandable, buildable, and extensible for engineers, developers, and operations teams."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="Mission and positioning.">
          <SummaryBlock summary="MESkit is a standards-aligned, AI-native MES toolkit built in the open. The project focuses on concrete mechanisms: typed operations, ISA-95 language, simulation-first rollout, and a clear path to MQTT-fed execution." />
        </Section>

        <Section title="Mission" subtitle="What the project is trying to solve.">
          <div className="grid-2">
            <article className="card">
              <h3>Reduce MES learning friction</h3>
              <p>
                Many teams understand MES concepts but cannot evaluate architecture without proprietary
                systems. MESkit provides a transparent baseline.
              </p>
            </article>
            <article className="card">
              <h3>Connect AI to real operations</h3>
              <p>
                AI agents are useful only when tied to explicit operational interfaces. MESkit enforces this
                through shared tools.
              </p>
            </article>
            <article className="card">
              <h3>Keep standards visible</h3>
              <p>
                ISA-95 terms stay first-class in data and documentation, supporting interoperability and
                long-term clarity.
              </p>
            </article>
            <article className="card">
              <h3>Enable practical experimentation</h3>
              <p>
                Simulation-first workflows let teams validate line design, quality rules, and planner logic
                before connecting real devices.
              </p>
            </article>
          </div>
        </Section>

        <Section title="Open-source stance" subtitle="Why the repository is central.">
          <div className="card">
            <p>
              Core specs, roadmap checkpoints, and implementation progress are designed to stay public.
              Technical claims should be verifiable against source files and release history.
            </p>
            <p style={{ marginTop: '0.8rem' }}>
              Follow progress on{' '}
              <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>{' '}
              and use the <Link href="/roadmap">roadmap</Link> for milestone status.
            </p>
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="Machine-readable, citation-ready context.">
          <div className="grid-2">
            <KeyFacts facts={facts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/product', label: 'See product overview' }}
              secondary={{ href: '/agents', label: 'Meet the agents' }}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
