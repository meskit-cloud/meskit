import type { MetadataRoute } from 'next';

import { blogPosts } from '@/lib/blog';
import { siteConfig } from '@/lib/site';

const staticRoutes = [
  '',
  '/product',
  '/agents',
  '/isa-95',
  '/architecture',
  '/roadmap',
  '/docs',
  '/blog',
  '/about',
  '/faq',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
