import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { extractApiToken, verifyWebhookSecret } from '@/lib/webhook-verify';
import { tryMapPayload } from '@/lib/mapper-service';
import { clientIdentifier, consumeRateLimit } from '@/lib/rate-limit';
import {
  optionalFiniteNumber,
  parseEventTime,
  readJsonBody,
  RequestValidationError,
  validateCoordinates,
  validateBattery,
  validateDeviceId,
} from '@/lib/request-validation';

type GenericPayload = Record<string, unknown> & {
  device_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  timestamp?: unknown;
  battery?: unknown;
  type?: unknown;
  temp?: unknown;
  light?: unknown;
};

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (!(await verifyWebhookSecret(req))) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key', requestId }, { status: 401 });
    }

    const subject = extractApiToken(req) || clientIdentifier(req);
    const rateLimit = await consumeRateLimit('ingest', subject, 600, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', requestId },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await readJsonBody<GenericPayload>(req);
    const deviceId = validateDeviceId(body.device_id);
    const deviceType = typeof body.type === 'string' ? body.type.slice(0, 40) : 'generic';

    let latValue = body.lat;
    let lonValue = body.lon;
    let timestampValue = body.timestamp;
    let batteryValue = body.battery;
    let tempValue = body.temp;
    let lightValue = body.light;

    const mapped = await tryMapPayload(deviceId, body, deviceType);
    if (mapped) {
      latValue = mapped.lat ?? latValue;
      lonValue = mapped.lon ?? lonValue;
      timestampValue = mapped.ts ?? timestampValue;
      batteryValue = mapped.battery ?? batteryValue;
      tempValue = mapped.temp ?? tempValue;
      lightValue = mapped.light ?? lightValue;
    }

    const { lat, lon } = validateCoordinates(latValue, lonValue);
    const eventTime = timestampValue instanceof Date ? timestampValue : parseEventTime(timestampValue);
    const battery = validateBattery(batteryValue);
    const temp = optionalFiniteNumber(tempValue, 'temp');
    const light = optionalFiniteNumber(lightValue, 'light');

    const device = await prisma.$transaction(async (tx) => {
      const ensured = await tx.device.upsert({
        where: { externalId: deviceId },
        create: {
          externalId: deviceId,
          name: deviceId,
          type: deviceType,
          source: 'http',
          tags: [],
          lastSeen: eventTime,
          lastLat: lat,
          lastLon: lon,
          lastBattery: battery === undefined ? null : Math.round(battery),
        },
        // A no-op update keeps first-packet creation atomic and locks the row
        // until this transaction has recorded the position and event.
        update: { externalId: deviceId },
      });
      const record = eventTime >= ensured.lastSeen
        ? await tx.device.update({
            where: { id: ensured.id },
            data: {
              lastSeen: eventTime,
              lastLat: lat,
              lastLon: lon,
              lastBattery: battery === undefined ? null : Math.round(battery),
            },
          })
        : ensured;

      await tx.position.create({
        data: {
          deviceId: record.id,
          ts: eventTime,
          lat,
          lon,
          battery: battery === undefined ? null : Math.round(battery),
          temp: temp ?? null,
          light: light ?? null,
          source: 'http',
        },
      });

      await tx.deviceEvent.create({
        data: { deviceId: record.id, ts: eventTime, payload: body as Prisma.InputJsonObject },
      });
      return record;
    });

    console.info('[Ingest]', { requestId, source: 'http', status: 201, durationMs: Date.now() - startedAt });
    return NextResponse.json({ success: true, deviceId: device.id, requestId }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, requestId }, { status: error.status });
    }
    console.error('[Ingest]', { requestId, source: 'http', status: 500, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: 'Internal Server Error', requestId }, { status: 500 });
  }
}
