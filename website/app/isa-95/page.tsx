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
  title: 'ISA-95 mapping',
  description:
    'MESkit ISA-95 mapping: physical assets, product model, process model, production execution, and quality operations in a standards-aligned schema.',
  path: '/isa-95',
  keywords: [
    'ISA-95 software model',
    'ISA-95 MES example',
    'manufacturing data model',
    'ISA-95 level 3',
  ],
});

const breadcrumbs = [{ name: 'ISA-95', path: '/isa-95' }];

const facts = [
  'MESkit maps ISA-95 terms directly to relational tables.',
  'Discrete production is the default UX in MVP.',
  'Batch and continuous are schema-ready but UI-future.',
  'Agents operate at ISA-95 Level 3 through the same tool layer as humans.',
];

const miniFaq = [
  {
    question: 'Does MESkit use proprietary terms instead of ISA-95?',
    answer: 'No. MESkit keeps ISA-95 language explicit in schema and documentation.',
  },
  {
    question: 'Can agents operate below Level 3 equipment control?',
    answer:
      'No. Agents operate in Level 3 coordination through MES tools, with MQTT bridge planned for future ingestion.',
  },
];

export default function Isa95Page() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="ISA-95 mapping"
          description="MESkit follows ISA-95 terminology and boundaries so engineers can model physical assets, process definitions, execution traces, and quality operations without translation gaps."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="How standards alignment is applied in practice.">
          <SummaryBlock summary="MESkit aligns to ISA-95 by mapping each concept to concrete database structures and tool contracts. This makes the model interoperable with established manufacturing language while staying developer-friendly in a modern web stack." />
        </Section>

        <Section title="Term mapping table" subtitle="ISA-95 term to MESkit implementation.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ISA-95 concept</th>
                  <th>MESkit implementation</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Physical model</td>
                  <td>Asset hierarchy</td>
                  <td>
                    <code>lines</code> → <code>workstations</code> → <code>machines</code>
                  </td>
                </tr>
                <tr>
                  <td>Product model</td>
                  <td>What to build</td>
                  <td>
                    <code>part_numbers</code>, <code>items</code>, <code>bom_entries</code>
                  </td>
                </tr>
                <tr>
                  <td>Process model</td>
                  <td>How flow is defined</td>
                  <td>
                    <code>routes</code>, <code>route_steps</code>
                  </td>
                </tr>
                <tr>
                  <td>Production execution</td>
                  <td>Unit state and traceability</td>
                  <td>
                    <code>units</code>, <code>unit_history</code>
                  </td>
                </tr>
                <tr>
                  <td>Quality operations</td>
                  <td>Defect and event tracking</td>
                  <td>
                    <code>quality_events</code>, <code>defect_codes</code>
                  </td>
                </tr>
                <tr>
                  <td>Future device integration</td>
                  <td>Sensor ingestion</td>
                  <td>
                    <code>mqtt_messages</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Production type coverage" subtitle="Current and planned execution models.">
          <div className="grid-2">
            <div className="card">
              <h3>Discrete manufacturing</h3>
              <p>
                MVP default. Unit-level tracking with serial algorithms, route steps, pass/fail gates, and
                execution history.
              </p>
            </div>
            <div className="card">
              <h3>Batch and continuous</h3>
              <p>
                Data structures are ready for extension, but dedicated UI workflows are post-MVP roadmap
                items.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Agent operations at Level 3" subtitle="Same level as human operators and supervisors.">
          <div className="callout">
            <p>
              MESkit agents operate at ISA-95 Level 3 through the tool layer. They orchestrate execution and
              analysis but do not directly replace equipment-level control logic.
            </p>
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="Citation-friendly context blocks.">
          <div className="grid-2">
            <KeyFacts facts={facts} />
            <MiniFaq items={miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/architecture', label: 'View architecture' }}
              secondary={{ href: '/agents', label: 'See agent runtime' }}
            />
          </div>
        </Section>

        <Section title="Related pages" subtitle="Canonical internal references.">
          <div className="card">
            <ul className="clean-list">
              <li>
                <Link href="/architecture">Architecture: tool layer and runtime design</Link>
              </li>
              <li>
                <Link href="/agents">Agents: triggers, roles, tool-call examples</Link>
              </li>
              <li>
                <Link href="/docs">Docs entry: implementation and setup sources</Link>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
