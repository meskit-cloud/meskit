import Link from 'next/link';
import type { ReactNode } from 'react';

import type { BreadcrumbItem } from '@/lib/site';

export function PageIntro({
  title,
  description,
  updated,
}: {
  title: string;
  description: string;
  updated: string;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">MESkit public website</p>
      <h1>{title}</h1>
      <p className="lead">{description}</p>
      <p className="updated">Last updated: {updated}</p>
    </header>
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      <div className="section-content">{children}</div>
    </section>
  );
}

export function SummaryBlock({ summary }: { summary: string }) {
  return (
    <div className="summary-block">
      <h3>Summary</h3>
      <p>{summary}</p>
    </div>
  );
}

export function KeyFacts({ facts }: { facts: string[] }) {
  return (
    <div className="card">
      <h3>Key facts</h3>
      <ul className="clean-list">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}

export function MiniFaq({
  title = 'Mini FAQ',
  items,
}: {
  title?: string;
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="faq-list">
        {items.map((item) => (
          <article key={item.question}>
            <h4>{item.question}</h4>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CtaRow({
  primary,
  secondary,
}: {
  primary: { href: string; label: string; external?: boolean };
  secondary?: { href: string; label: string; external?: boolean };
}) {
  return (
    <div className="cta-row">
      <SmartLink href={primary.href} external={primary.external} className="btn btn-primary">
        {primary.label}
      </SmartLink>
      {secondary ? (
        <SmartLink
          href={secondary.href}
          external={secondary.external}
          className="btn btn-secondary"
        >
          {secondary.label}
        </SmartLink>
      ) : null}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        {items.map((item) => (
          <li key={item.path}>
            <span aria-hidden="true">/</span>
            <Link href={item.path}>{item.name}</Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SmartLink({
  href,
  external,
  children,
  className,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
