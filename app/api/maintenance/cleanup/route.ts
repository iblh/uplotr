import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function runCleanup() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'data_retention_days' } });
  const parsedDays = setting ? Number.parseInt(setting.value, 10) : 30;
  const retentionDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [positions, events, rateLimits] = await prisma.$transaction([
    prisma.position.deleteMany({ where: { ts: { lt: cutoffDate } } }),
    prisma.deviceEvent.deleteMany({ where: { ts: { lt: cutoffDate } } }),
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);

  return {
    success: true,
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    deleted: { positions: positions.count, events: events.count, rateLimits: rateLimits.count },
  };
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCleanup());
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;
  try {
    return NextResponse.json(await runCleanup());
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
