import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: ['/', '/demo', '/docs/'], disallow: ['/app', '/login', '/api/'] }, sitemap: 'https://uplotr.com/sitemap.xml' };
}
