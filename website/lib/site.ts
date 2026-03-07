import type { Metadata } from 'next';

export const siteConfig = {
  name: 'MESkit',
  title: 'MESkit | Open-Source MES',
  description:
    'Open-source MES with built-in analytics, quality alerts, and natural language queries. ISA-95 aligned, simulation-first, MQTT-ready.',
  url: 'https://meskit.cloud',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  githubUrl: 'https://github.com/meskit-cloud/meskit',
  docsUrl: 'https://meskit.cloud/docs',
  lastUpdated: 'March 5, 2026',
  author: 'MESkit Team',
};

export type NavLink = {
  href: string;
  label: string;
};

export const navLinks: NavLink[] = [
  { href: '/product', label: 'Product' },
  { href: '/docs', label: 'Docs' },
  { href: '/agents', label: 'Smart Features' },
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
      { href: '/agents', label: 'Smart Features' },
      { href: '/architecture', label: 'Architecture' },
      { href: '/roadmap', label: 'Roadmap' },
      { href: `${siteConfig.appUrl}/signup`, label: 'Sign up', external: true },
      { href: `${siteConfig.appUrl}/login`, label: 'Sign in', external: true },
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
          alt: 'MESkit open-source MES toolkit',
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
  'Category: Open-source MES toolkit with built-in analytics (MIT license).',
  'Identity: Open-source MES with dashboards, quality alerts, and natural language queries. Operators stay in command.',
  'Standards: ISA-95 aligned data model with 15 mapped Postgres tables.',
  'Tool layer: 26 Zod-validated server actions shared by UI and intelligence layer.',
  'Smart features: Ask MESkit (natural language queries), Quality Monitor, Production Planner.',
  'North Star: Predict machine failure and coordinate the response via three automation layers (Monitor, Plan, Act) — operators stay in command.',
  'Roadmap: 6 milestones (M1 complete, M2 in progress, through M6 MQTT integration).',
  'Stack: Next.js, Supabase, Gemini API (tool-use), TypeScript.',
];

export const taxonomy = [
  'ISA-95',
  'MES architecture',
  'Smart features',
  'Simulation',
  'MQTT',
  'Supabase',
];
