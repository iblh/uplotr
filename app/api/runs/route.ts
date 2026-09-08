import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin, requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (isAuthResponse(auth)) return auth;

  const deviceId = new URL(req.url).searchParams.get('deviceId');
  if (!deviceId) return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });

  const runs = await prisma.fieldTestRun.findMany({
    where: { deviceId },
    orderBy: { startedAt: 'desc' },
    take: 30,
    include: { _count: { select: { positions: true } } },
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';
  const hardwareVersion = typeof body?.hardwareVersion === 'string'
    ? body.hardwareVersion.trim().slice(0, 120)
    : '';
  const firmwareVersion = typeof body?.firmwareVersion === 'string'
    ? body.firmwareVersion.trim().slice(0, 120)
    : '';
  const activityType = body?.activityType === 'FLIGHT' ? 'FLIGHT' : 'GROUND';
  const expectedIntervalSeconds = Number.isInteger(body?.expectedIntervalSeconds)
    && body.expectedIntervalSeconds > 0
    && body.expectedIntervalSeconds <= 86_400
    ? body.expectedIntervalSeconds
    : null;
  const minSamples = Number.isInteger(body?.minSamples)
    && body.minSamples >= 2
    && body.minSamples <= 100_000
    ? body.minSamples
    : activityType === 'FLIGHT' ? 10 : 2;

  if (!deviceId || !name || name.length > 160) {
    return NextResponse.json({ error: 'deviceId and a run name (1-160 characters) are required' }, { status: 400 });
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

  try {
    const run = await prisma.fieldTestRun.create({
      data: {
        deviceId,
        name,
        notes: notes || null,
        hardwareVersion: hardwareVersion || null,
        firmwareVersion: firmwareVersion || null,
        activityType,
        expectedIntervalSeconds,
        minSamples,
      },
      include: { _count: { select: { positions: true } } },
    });
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This device already has an active field test' }, { status: 409 });
    }
    throw error;
  }
}
