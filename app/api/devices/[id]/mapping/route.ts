import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';
import { discoverPaths } from '@/lib/mapper-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const { id } = await params;

  const device = await prisma.device.findUnique({
    where: { id },
    include: { mapper: true }
  });

  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

  const latestEvent = await prisma.deviceEvent.findFirst({
    where: { deviceId: id },
    orderBy: { ts: 'desc' }
  });

  const templates = await prisma.payloadMapper.findMany({
    where: { isTemplate: true }
  });

  // Generate suggested paths based on the latest payload
  let suggestedPaths = {};
  if (latestEvent?.payload) {
    suggestedPaths = discoverPaths(latestEvent.payload);
  }

  return NextResponse.json({
    device,
    latestEvent,
    templates,
    suggestedPaths
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const { id } = await params;
  const body = await req.json();
  const { mapperId, customMapper, saveAsTemplate, templateName, reprocess, overwriteTemplateId } = body;

  // Case 1: Just reprocessing history
  if (reprocess && !customMapper && !mapperId) {
    return handleReprocessStream(id);
  }

  // Case 2: Updating configuration (and optionally reprocessing)
  let finalMapperId = mapperId;

  if (customMapper) {
    if (overwriteTemplateId) {
      await prisma.payloadMapper.update({
        where: { id: overwriteTemplateId },
        data: {
          ...customMapper,
          name: templateName || undefined,
        }
      });
      finalMapperId = overwriteTemplateId;
    } else {
      const mapper = await prisma.payloadMapper.create({
        data: {
          ...customMapper,
          name: saveAsTemplate ? (templateName || `Template from ${id}`) : `Custom for ${id}`,
          isTemplate: !!saveAsTemplate,
        }
      });
      finalMapperId = mapper.id;
    }
  }

  await prisma.device.update({
    where: { id },
    data: { mapperId: finalMapperId === undefined ? undefined : (finalMapperId || null) }
  });

  if (reprocess) {
    return handleReprocessStream(id);
  }
    
  return NextResponse.json({ success: true });
}

async function handleReprocessStream(deviceId: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = await prisma.deviceEvent.findMany({
          where: { deviceId },
          orderBy: { ts: 'asc' }
        });

        const total = events.length;
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'start', total }) + '\n'));

        const { tryMapPayload } = await import('@/lib/mapper-service');
        const device = await prisma.device.findUnique({ where: { id: deviceId } });

        for (let i = 0; i < total; i++) {
          const event = events[i];
          const mapped = await tryMapPayload(device?.externalId || deviceId, event.payload, device?.type);
          
          if (mapped && mapped.lat !== undefined && mapped.lon !== undefined) {
            await prisma.position.updateMany({
              where: { 
                deviceId,
                ts: event.ts 
              },
              data: {
                ts: mapped.ts || event.ts,
                lat: mapped.lat,
                lon: mapped.lon,
                battery: mapped.battery,
                temp: mapped.temp,
                light: mapped.light,
                rssi: mapped.rssi,
                snr: mapped.snr
              }
            });
          }

          // Send progress every 5 events or at the end
          if (i % 5 === 0 || i === total - 1) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', current: i + 1, total }) + '\n'));
          }
        }

        controller.enqueue(encoder.encode(JSON.stringify({ type: 'complete' }) + '\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' }
  });
}
