import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

const routes = [
  '',
  '/fonctionnalites',
  '/comment-ca-marche',
  '/apercu-bot',
  '/education',
  '/communaute',
  '/faq',
  '/roadmap',
  '/legal/disclaimer',
  '/legal/mentions-legales',
  '/legal/confidentialite',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}