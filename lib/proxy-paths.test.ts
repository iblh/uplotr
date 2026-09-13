import { describe, expect, it } from 'vitest';

/**
 * Mirrors the path-exemption rules in `proxy.ts`.
 *
 * These paths are checked before the auth redirect, so a regression here does
 * not fail a build or a type check — it silently bounces real traffic to
 * /login. Vercel's analytics beacons are the case that motivated this: they
 * are extensionless, so they match none of the other exemptions.
 */
const PUBLIC_ASSET = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?)$/i;

function isExemptFromAuth(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel/') ||
    PUBLIC_ASSET.test(pathname) ||
    pathname.startsWith('/docs/')
  );
}

describe('auth proxy path exemptions', () => {
  it('lets Vercel Web Analytics beacons through', () => {
    // Without these an anonymous page view is redirected to /login and the
    // collector never sees it, so analytics silently reports nothing.
    expect(isExemptFromAuth('/_vercel/insights/view')).toBe(true);
    expect(isExemptFromAuth('/_vercel/insights/event')).toBe(true);
    expect(isExemptFromAuth('/_vercel/insights/script.js')).toBe(true);
  });

  it('lets framework assets and docs through', () => {
    expect(isExemptFromAuth('/_next/static/chunk.js')).toBe(true);
    expect(isExemptFromAuth('/docs/quick-start')).toBe(true);
    expect(isExemptFromAuth('/icon.svg')).toBe(true);
    expect(isExemptFromAuth('/fonts/inter.woff2')).toBe(true);
  });

  it('still guards application and API routes', () => {
    expect(isExemptFromAuth('/app')).toBe(false);
    expect(isExemptFromAuth('/api/devices')).toBe(false);
    expect(isExemptFromAuth('/settings')).toBe(false);
  });

  it('does not exempt lookalike paths outside the reserved prefix', () => {
    // `/_vercel` is matched with a trailing slash so a route merely starting
    // with those characters is not accidentally made public.
    expect(isExemptFromAuth('/_vercelish')).toBe(false);
    expect(isExemptFromAuth('/api/_vercel/insights')).toBe(false);
  });
});
