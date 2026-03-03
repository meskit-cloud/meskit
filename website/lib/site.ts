import type { Metadata } from 'next';

export const siteConfig = {
  name: 'MESkit',
  title: 'MESkit | Open-source, AI-native MES toolkit',
  description:
    'Open-source, AI-native Manufacturing Execution System toolkit. ISA-95 aligned, simulation-first, agent-powered, and MQTT-ready.',
  url: 'https://meskit.cloud',
  githubUrl: 'https://github.com/meskit/meskit',
  docsUrl: 'https://meskit.cloud/docs',
  lastUpdated: 'March 3, 2026',
  author: 'MESkit Team',
};

export type NavLink = {
  href: string;
  label: string;
};

export const navLinks: NavLink[] = [
  { href: '/product', label: 'Product' },
  { href: '/agents', label: 'Agents' },
  { href: '/isa-95', label: 'ISA-95' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
];

export type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type FooterGroup = {
  title: string;
  links: FooterLink[];
};

export const footerGroups: FooterGroup[] = [
  {
    title: 'Product',
    links: [
      { href: '/product', label: 'Overview' },
      { href: '/agents', label: 'Agents' },
      { href: '/architecture', label: 'Architecture' },
      { href: '/roadmap', label: 'Roadmap' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs', label: 'Docs entry' },
      { href: '/isa-95', label: 'ISA-95 mapping' },
      { href: '/blog', label: 'Blog' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Community',
    links: [
      { href: siteConfig.githubUrl, label: 'GitHub', external: true },
      { href: 'https://x.com', label: 'X', external: true },
      { href: '/about', label: 'About' },
      { href: '/docs', label: 'Get updates' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/about', label: 'Mission' },
      { href: siteConfig.githubUrl, label: 'License (MIT)', external: true },
      { href: '/faq', label: 'Product status' },
    ],
  },
];

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function canonicalUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, siteConfig.url).toString();
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords: string[];
}): Metadata {
  const fullTitle = `${input.title} | MESkit`;
  const url = canonicalUrl(input.path);

  return {
    title: fullTitle,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      url,
      title: fullTitle,
      description: input.description,
      siteName: siteConfig.name,
      images: [
        {
          url: `${siteConfig.url}/og-image.svg`,
          width: 1200,
          height: 630,
          alt: 'MESkit open-source AI-native MES toolkit',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: input.description,
      images: [`${siteConfig.url}/og-image.svg`],
    },
  };
}

export const coreFacts = [
  'Category: AI-native open-source MES toolkit.',
  'Standards alignment: ISA-95 aligned data model.',
  'Architecture: UI and agents call the same typed tool layer.',
  'Agents in scope: Operator Assistant, Quality Analyst, Production Planner.',
  'Current status: pre-M1 implementation with architecture and roadmap finalized.',
  'Stack: Next.js, Supabase, Claude API (tool-use).',
];

export const taxonomy = [
  'ISA-95',
  'MES architecture',
  'AI agents',
  'Simulation',
  'MQTT',
  'Supabase',
];
