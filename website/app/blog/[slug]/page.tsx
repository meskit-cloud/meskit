import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import {
  Breadcrumbs,
  CtaRow,
  KeyFacts,
  MiniFaq,
  Section,
  SummaryBlock,
} from '@/components/page-elements';
import { blogPosts, getPostBySlug } from '@/lib/blog';
import { buildPageMetadata, siteConfig } from '@/lib/site';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return buildPageMetadata({
      title: 'Blog article',
      description: 'MESkit technical blog article.',
      path: `/blog/${slug}`,
      keywords: ['MESkit blog'],
    });
  }

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const crumbs = [
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <div className="page">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.excerpt,
          path: `/blog/${post.slug}`,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          author: post.author,
        })}
      />

      <div className="container">
        <Breadcrumbs items={crumbs} />

        <header className="page-intro">
          <p className="eyebrow">{post.category}</p>
          <h1>{post.title}</h1>
          <p className="lead">{post.excerpt}</p>
          <div className="post-meta">
            <span>Author: {post.author}</span>
            <span>Published: {post.publishedAt}</span>
            <span>Updated: {post.updatedAt}</span>
          </div>
        </header>

        <Section title="Summary" subtitle="2-4 sentence snapshot for quick retrieval.">
          <SummaryBlock summary={post.summary} />
        </Section>

        {post.sections.map((section) => (
          <Section key={section.heading} title={section.heading}>
            <div className="card">
              <div className="faq-list">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </Section>
        ))}

        <Section title="Key facts and mini FAQ" subtitle="Answer-ready end section.">
          <div className="grid-2">
            <KeyFacts facts={post.keyFacts} />
            <MiniFaq items={post.miniFaq} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <CtaRow
              primary={{ href: '/product', label: 'See product page' }}
              secondary={{ href: '/docs', label: 'Read docs' }}
            />
          </div>
        </Section>

        <Section title="Canonical links" subtitle="Related supporting pages.">
          <div className="card">
            <ul className="clean-list">
              <li>
                <Link href="/agents">Smart features</Link>
              </li>
              <li>
                <Link href="/architecture">Architecture page</Link>
              </li>
              <li>
                <Link href="/isa-95">ISA-95 mapping</Link>
              </li>
              <li>
                <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer">
                  Repository
                </a>
              </li>
            </ul>
          </div>
        </Section>
      </div>
    </div>
  );
}
