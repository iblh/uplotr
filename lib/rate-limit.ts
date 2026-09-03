import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const key = createHash('sha256').update(`${scope}:${identifier}`).digest('hex');
  const expiresAt = new Date(now.getTime() + windowMs);
  const [bucket] = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
    INSERT INTO "rate_limit_buckets" ("key", "count", "windowStart", "expiresAt", "updatedAt")
    VALUES (${key}, 1, ${now}, ${expiresAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN ${now}
        ELSE "rate_limit_buckets"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN ${expiresAt}
        ELSE "rate_limit_buckets"."expiresAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "expiresAt"
  `;

  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: allowed ? Math.max(0, limit - bucket.count) : 0,
    retryAfter: allowed ? 0 : Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

export function clientIdentifier(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}
