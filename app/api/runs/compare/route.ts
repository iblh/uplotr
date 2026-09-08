import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireUser } from '@/lib/api-auth';
import { analyzeRun, compareRunCompatibility, compareRuns } from '@/lib/run-analysis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const leftId = searchParams.get('left');
  const rightId = searchParams.get('right');
  if (!leftId || !rightId || leftId === rightId) {
    return NextResponse.json({ error: 'Two different run ids are required' }, { status: 400 });
  }

  const runs = await prisma.fieldTestRun.findMany({
    where: { id: { in: [leftId, rightId] } },
    include: {
      device: { select: { id: true, name: true, externalId: true } },
      positions: {
        orderBy: { ts: 'asc' },
        select: { ts: true, lat: true, lon: true, battery: true, metrics: true },
      },
    },
  });
  const left = runs.find((run) => run.id === leftId);
  const right = runs.find((run) => run.id === rightId);
  if (!left || !right) return NextResponse.json({ error: 'Field test not found' }, { status: 404 });
  if (left.deviceId !== right.deviceId) {
    return NextResponse.json({ error: 'Runs must belong to the same device' }, { status: 400 });
  }

  const leftAnalysis = analyzeRun(left.positions, {
    activityType: left.activityType,
    expectedIntervalSeconds: left.expectedIntervalSeconds,
    minSamples: left.minSamples,
  });
  const rightAnalysis = analyzeRun(right.positions, {
    activityType: right.activityType,
    expectedIntervalSeconds: right.expectedIntervalSeconds,
    minSamples: right.minSamples,
  });
  const compatibility = left.activityType === right.activityType
    ? compareRunCompatibility(leftAnalysis, rightAnalysis)
    : {
        status: 'INVALID' as const,
        score: 0,
        reasons: ['Ground and flight runs use different protocols and should not be compared directly.'],
      };
  return NextResponse.json({
    left: { run: { ...left, positions: undefined }, analysis: leftAnalysis },
    right: { run: { ...right, positions: undefined }, analysis: rightAnalysis },
    delta: compareRuns(leftAnalysis, rightAnalysis),
    compatibility,
  });
}
