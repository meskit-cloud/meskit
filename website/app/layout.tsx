import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';

import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { siteConfig } from '@/lib/site';

import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'MESkit open-source MES toolkit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: ['/og-image.svg'],
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/favicon.svg`,
  sameAs: [siteConfig.githubUrl],
  description: siteConfig.description,
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MESkit',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Open-source Manufacturing Execution System toolkit with built-in analytics, quality alerts, and natural language queries. ISA-95 aligned and simulation-first.',
  softwareVersion: 'MVP roadmap phase',
  creator: {
    '@type': 'Organization',
    name: 'MESkit',
  },
  url: siteConfig.url,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${ibmPlexMono.variable}`}>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={softwareJsonLd} />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
