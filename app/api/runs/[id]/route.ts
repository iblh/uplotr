import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin, requireUser } from '@/lib/api-auth';
import { analyzeRun } from '@/lib/run-analysis';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req);
  if (isAuthResponse(auth)) return auth;
  const { id } = await params;

  const run = await prisma.fieldTestRun.findUnique({
    where: { id },
    include: {
      device: { select: { id: true, name: true, externalId: true } },
      positions: {
        orderBy: { ts: 'asc' },
        select: { ts: true, lat: true, lon: true, battery: true, metrics: true },
      },
    },
  });
  if (!run) return NextResponse.json({ error: 'Field test not found' }, { status: 404 });

  return NextResponse.json({
    run: { ...run, positions: undefined },
    analysis: analyzeRun(run.positions, {
      activityType: run.activityType,
      expectedIntervalSeconds: run.expectedIntervalSeconds,
      minSamples: run.minSamples,
    }),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const existing = await prisma.fieldTestRun.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Field test not found' }, { status: 404 });

  const nextStatus = body?.status === 'COMPLETED' ? 'COMPLETED' : existing.status;
  const run = await prisma.fieldTestRun.update({
    where: { id },
    data: {
      name: typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim().slice(0, 160)
        : undefined,
      notes: typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : undefined,
      hardwareVersion: typeof body?.hardwareVersion === 'string'
        ? body.hardwareVersion.trim().slice(0, 120) || null
        : undefined,
      firmwareVersion: typeof body?.firmwareVersion === 'string'
        ? body.firmwareVersion.trim().slice(0, 120) || null
        : undefined,
      activityType: body?.activityType === 'FLIGHT' || body?.activityType === 'GROUND'
        ? body.activityType
        : undefined,
      expectedIntervalSeconds: Number.isInteger(body?.expectedIntervalSeconds)
        && body.expectedIntervalSeconds > 0
        && body.expectedIntervalSeconds <= 86_400
        ? body.expectedIntervalSeconds
        : undefined,
      minSamples: Number.isInteger(body?.minSamples)
        && body.minSamples >= 2
        && body.minSamples <= 100_000
        ? body.minSamples
        : undefined,
      status: nextStatus,
      endedAt: nextStatus === 'COMPLETED' && existing.status !== 'COMPLETED'
        ? new Date()
        : undefined,
    },
    include: { _count: { select: { positions: true } } },
  });
  return NextResponse.json(run);
}
