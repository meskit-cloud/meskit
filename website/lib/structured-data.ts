import { canonicalUrl, siteConfig, type BreadcrumbItem } from './site';

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteConfig.url,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: canonicalUrl(item.path),
      })),
    ],
  };
}

export function faqJsonLd(
  entries: Array<{
    question: string;
    answer: string;
  }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
}) {
  const url = canonicalUrl(input.path);

  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    author: {
      '@type': 'Organization',
      name: input.author,
      url: siteConfig.url,
      sameAs: [siteConfig.githubUrl],
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: url,
    url,
  };
}

export function howToJsonLd(input: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function definedTermJsonLd(
  terms: Array<{ name: string; description: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'MESkit terminology',
    hasDefinedTerm: terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.name,
      description: term.description,
    })),
  };
}

export function softwareSourceCodeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'MESkit — Source-Available MES',
    description: siteConfig.description,
    codeRepository: siteConfig.githubUrl,
    programmingLanguage: ['TypeScript', 'SQL'],
    runtimePlatform: 'Node.js',
    license: 'https://mariadb.com/bsl11/',
  };
}
