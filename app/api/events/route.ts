import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireUser } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
  }

  try {
    const events = await prisma.deviceEvent.findMany({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      take: 20, // Limit to last 20 events
    });
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
