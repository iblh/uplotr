import type { MetadataRoute } from 'next';
import { docs } from '@/lib/docs';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://uplotr.com';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/demo`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs`, changeFrequency: 'weekly', priority: 0.9 },
    ...docs.map(({ slug }) => ({ url: `${base}/docs/${slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
