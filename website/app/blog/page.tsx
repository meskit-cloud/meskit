import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import {
  Breadcrumbs,
  KeyFacts,
  MiniFaq,
  PageIntro,
  Section,
  SummaryBlock,
} from '@/components/page-elements';
import { blogPosts } from '@/lib/blog';
import { buildPageMetadata, siteConfig, taxonomy } from '@/lib/site';
import { breadcrumbJsonLd } from '@/lib/structured-data';

export const metadata = buildPageMetadata({
  title: 'Blog',
  description:
    'MESkit blog for ISA-95, AI-native MES architecture, tool-layer implementation, simulation workflows, and MQTT transition guidance.',
  path: '/blog',
  keywords: [
    'AI-native MES blog',
    'ISA-95 for developers',
    'MES architecture articles',
    'manufacturing AI agent blog',
  ],
});

const breadcrumbs = [{ name: 'Blog', path: '/blog' }];

const blogFacts = [
  'Categories: ISA-95, MES architecture, AI agents, simulation, MQTT, Supabase.',
  'Each post includes author, publish date, and update date.',
  'Posts link to canonical product and docs pages.',
  'Launch set includes five cornerstone technical explainers.',
];

const blogFaq = [
  {
    question: 'How often is the blog updated?',
    answer: 'Launch cadence targets at least two high-quality posts per month.',
  },
  {
    question: 'Are posts opinion pieces or technical references?',
    answer: 'Posts are written as technical explainers with concrete architecture detail.',
  },
];

const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: blogPosts.map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${siteConfig.url}/blog/${post.slug}`,
    name: post.title,
  })),
};

export default function BlogIndexPage() {
  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <JsonLd data={itemListJsonLd} />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />
        <PageIntro
          title="Blog"
          description="Technical content hub for AI-native MES architecture, ISA-95 implementation, and simulation-to-MQTT operational design."
          updated={siteConfig.lastUpdated}
        />

        <Section title="Summary" subtitle="What this content hub is for.">
          <SummaryBlock summary="The blog builds topical authority around programmable manufacturing execution systems. Articles are structured for both human readers and machine summarization, with consistent terminology and canonical links." />
        </Section>

        <Section title="Category taxonomy" subtitle="Primary editorial categories.">
          <div className="card">
            <div className="flow-row">
              {taxonomy.map((category) => (
                <span className="flow-step" key={category}>
                  {category}
                </span>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Launch articles" subtitle="Priority publication set.">
          <div className="post-grid">
            {blogPosts.map((post) => (
              <article className="card" key={post.slug}>
                <p className="eyebrow" style={{ marginBottom: '0.6rem' }}>
                  {post.category}
                </p>
                <h3>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p style={{ marginTop: '0.6rem' }}>{post.excerpt}</p>
                <div className="post-meta">
                  <span>Author: {post.author}</span>
                  <span>Published: {post.publishedAt}</span>
                  <span>Updated: {post.updatedAt}</span>
                </div>
                <p style={{ marginTop: '0.8rem' }}>
                  <Link href={`/blog/${post.slug}`}>Read article</Link>
                </p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Key facts and mini FAQ" subtitle="Answer-ready blog operations context.">
          <div className="grid-2">
            <KeyFacts facts={blogFacts} />
            <MiniFaq items={blogFaq} />
          </div>
        </Section>
      </div>
    </div>
  );
}
