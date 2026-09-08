import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';
import { FLIGHT_LOG_FORMATS, parseFlightLog, type FlightLogFormat, type ParsedFlightLog } from '@/lib/flight-log';
import { analyzeRun } from '@/lib/run-analysis';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function textField(form: FormData, key: string, maxLength: number): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  const file = form.get('file');
  const deviceId = textField(form, 'deviceId', 200);
  const name = textField(form, 'name', 160);
  const hardwareVersion = textField(form, 'hardwareVersion', 120);
  const firmwareVersion = textField(form, 'firmwareVersion', 120);
  const notes = textField(form, 'notes', 2000);
  const requestedFormat = textField(form, 'format', 40) || 'AUTO';

  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Choose a flight log up to 5 MB' }, { status: 400 });
  }
  if (!deviceId || !name) {
    return NextResponse.json({ error: 'deviceId and run name are required' }, { status: 400 });
  }
  if (!FLIGHT_LOG_FORMATS.includes(requestedFormat as FlightLogFormat)) {
    return NextResponse.json({ error: 'Unsupported flight log format' }, { status: 400 });
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId }, select: { id: true, lastSeen: true } });
  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

  let parsed: ParsedFlightLog;
  try {
    parsed = parseFlightLog(await file.text(), file.name, requestedFormat as FlightLogFormat);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to parse flight log',
    }, { status: 400 });
  }

  const first = parsed.points[0];
  const last = parsed.points.at(-1)!;
  try {
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.fieldTestRun.create({
        data: {
          deviceId,
          name,
          hardwareVersion: hardwareVersion || null,
          firmwareVersion: firmwareVersion || null,
          notes: notes || null,
          activityType: 'FLIGHT',
          sourceFormat: parsed.format,
          minSamples: 10,
          status: 'COMPLETED',
          startedAt: first.ts,
          endedAt: last.ts,
        },
      });
      await tx.position.createMany({
        data: parsed.points.map((point) => ({
          deviceId,
          runId: created.id,
          ts: point.ts,
          lat: point.lat,
          lon: point.lon,
          battery: point.battery,
          metrics: point.metrics as Prisma.InputJsonObject,
          source: `flight-log:${parsed.format.toLowerCase()}`,
        })),
      });
      if (last.ts >= device.lastSeen) {
        await tx.device.update({
          where: { id: deviceId },
          data: {
            type: 'drone',
            lastSeen: last.ts,
            lastLat: last.lat,
            lastLon: last.lon,
            lastBattery: last.battery,
          },
        });
      }
      return created;
    });

    return NextResponse.json({
      run,
      imported: parsed.points.length,
      detectedFields: parsed.detectedFields,
      analysis: analyzeRun(parsed.points, { activityType: 'FLIGHT', minSamples: 10 }),
    }, { status: 201 });
  } catch (error) {
    console.error('[Flight import] Database write failed', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to save flight log' }, { status: 500 });
  }
}
