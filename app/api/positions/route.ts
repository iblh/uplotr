import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subHours, subDays } from 'date-fns';
import { isAuthResponse, requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (isAuthResponse(auth)) return auth;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const range = searchParams.get('range') || '24h'; // 1h, 6h, 24h, 7d
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');
    
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    let fromDate: Date;
    let toDate: Date | undefined;

    if (fromParam || toParam) {
      if (!fromParam || !toParam) {
        return NextResponse.json({ error: 'from and to are required together' }, { status: 400 });
      }

      fromDate = new Date(fromParam);
      toDate = new Date(toParam);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to timestamp' }, { status: 400 });
      }
      if (fromDate >= toDate) {
        return NextResponse.json({ error: 'from must be earlier than to' }, { status: 400 });
      }
    } else {
      switch (range) {
        case '1h': fromDate = subHours(new Date(), 1); break;
        case '6h': fromDate = subHours(new Date(), 6); break;
        case '24h': fromDate = subHours(new Date(), 24); break;
        case '7d': fromDate = subDays(new Date(), 7); break;
        default: fromDate = subHours(new Date(), 24);
      }
    }

    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 2000;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 10000)
      : 2000;

    const positions = await prisma.position.findMany({
      where: {
        deviceId: deviceId,
        ts: {
          gte: fromDate,
          ...(toDate ? { lte: toDate } : {}),
        }
      },
      orderBy: {
        ts: 'asc' // Chronological order for playback
      },
      take: limit
    });

    return NextResponse.json(positions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}
