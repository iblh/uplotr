import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin, requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (isAuthResponse(auth)) return auth;
    const [devices, thresholdSetting] = await Promise.all([
      prisma.device.findMany({
        orderBy: {
          lastSeen: 'desc'
        }
      }),
      prisma.systemSetting.findUnique({
        where: { key: 'offline_threshold_minutes' }
      })
    ]);

    const thresholdMinutes = thresholdSetting
      ? parseInt(thresholdSetting.value, 10)
      : 15; // default to 15 mins

    const cutoffTime = Date.now() - (thresholdMinutes * 60 * 1000);

    const devicesWithStatus = devices.map(device => {
      const isOnline = device.lastSeen && new Date(device.lastSeen).getTime() > cutoffTime;
      return {
        ...device,
        status: isOnline ? 'online' : 'offline'
      };
    });

    return NextResponse.json(devicesWithStatus);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    const name = typeof body?.name === 'string' ? body.name.trim() : null;
    const group = typeof body?.group === 'string' ? body.group.trim() : null;
    const tags = Array.isArray(body?.tags) ? body.tags : null;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: any = {
      name: name && name.length > 0 ? name : null,
    };

    if (group !== null) {
      updateData.group = group && group.length > 0 ? group : null;
    }

    if (tags !== null) {
      updateData.tags = { set: tags };
    }

    const device = await prisma.device.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('[API Devices PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to update device: ${message}` }, { status: 500 });
  }
}
