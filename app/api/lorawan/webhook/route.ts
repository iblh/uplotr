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

type Payload = Record<string, any>;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (!(await verifyWebhookSecret(req))) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key', requestId }, { status: 401 });
    }

    const subject = extractApiToken(req) || clientIdentifier(req);
    const rateLimit = await consumeRateLimit('lorawan', subject, 600, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', requestId },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await readJsonBody<Payload>(req);
    const rawDeviceId = body.devEui
      || body.dev_eui
      || body.deviceInfo?.devEui
      || body.end_device_ids?.dev_eui
      || body.device_id;
    const deviceId = validateDeviceId(rawDeviceId);
    const deviceName = body.deviceName
      || body.device_name
      || body.deviceInfo?.deviceName
      || body.end_device_ids?.device_id
      || body.name;

    const timeValue = body.time || body.received_at || body.reported_at || body.uplink_message?.received_at;
    let eventTime = parseEventTime(timeValue);
    let decoded = body.object || body.decoded?.payload || body.uplink_message?.decoded_payload || {};
    if (Object.keys(decoded).length === 0 && (body.lat !== undefined || body.latitude !== undefined)) decoded = body;

    let latValue = decoded.latitude
      ?? decoded.lat
      ?? decoded.Latitude
      ?? decoded.Location?.lat
      ?? body.uplink_message?.locations?.user?.latitude;
    let lonValue = decoded.longitude
      ?? decoded.lon
      ?? decoded.Longitude
      ?? decoded.Location?.lon
      ?? body.uplink_message?.locations?.user?.longitude;
    let batteryValue = decoded.battery ?? decoded.bat ?? decoded.batteryLevel;
    let tempValue = decoded.temperature ?? decoded.temp;
    let lightValue = decoded.light ?? decoded.lux;
    let rssiValue = body.rxInfo?.[0]?.rssi ?? body.uplink_message?.rx_metadata?.[0]?.rssi;
    let snrValue = body.rxInfo?.[0]?.snr ?? body.uplink_message?.rx_metadata?.[0]?.snr;

    const mapped = await tryMapPayload(deviceId, body, 'lorawan');
    if (mapped) {
      latValue = mapped.lat ?? latValue;
      lonValue = mapped.lon ?? lonValue;
      eventTime = mapped.ts ?? eventTime;
      batteryValue = mapped.battery ?? batteryValue;
      tempValue = mapped.temp ?? tempValue;
      lightValue = mapped.light ?? lightValue;
      rssiValue = mapped.rssi ?? rssiValue;
      snrValue = mapped.snr ?? snrValue;
    }

    const hasCoordinates = latValue !== undefined || lonValue !== undefined;
    const coordinates = hasCoordinates ? validateCoordinates(latValue, lonValue) : null;
    const battery = validateBattery(batteryValue);
    const temp = optionalFiniteNumber(tempValue, 'temp');
    const light = optionalFiniteNumber(lightValue, 'light');
    const rssi = optionalFiniteNumber(rssiValue, 'rssi');
    const snr = optionalFiniteNumber(snrValue, 'snr');

    const device = await prisma.$transaction(async (tx) => {
      const ensured = await tx.device.upsert({
        where: { externalId: deviceId },
        create: {
          externalId: deviceId,
          name: typeof deviceName === 'string' && deviceName ? deviceName.slice(0, 120) : deviceId,
          source: 'lorawan',
          type: 'lorawan',
          tags: [],
          lastSeen: eventTime,
          lastLat: coordinates?.lat,
          lastLon: coordinates?.lon,
          lastBattery: battery === undefined ? null : Math.round(battery),
          lastRssi: rssi ?? null,
          lastSnr: snr ?? null,
        },
        // A no-op update keeps first-packet creation atomic and locks the row
        // until this transaction has recorded the position and event.
        update: { externalId: deviceId },
      });
      const record = eventTime >= ensured.lastSeen
        ? await tx.device.update({
            where: { id: ensured.id },
            data: {
              name: typeof deviceName === 'string' && deviceName ? deviceName.slice(0, 120) : ensured.name,
              lastSeen: eventTime,
              lastLat: coordinates?.lat ?? ensured.lastLat,
              lastLon: coordinates?.lon ?? ensured.lastLon,
              lastBattery: battery === undefined ? ensured.lastBattery : Math.round(battery),
              lastRssi: rssi ?? ensured.lastRssi,
              lastSnr: snr ?? ensured.lastSnr,
            },
          })
        : ensured;

      if (coordinates) {
        await tx.position.create({
          data: {
            deviceId: record.id,
            ts: eventTime,
            lat: coordinates.lat,
            lon: coordinates.lon,
            battery: battery === undefined ? null : Math.round(battery),
            temp: temp ?? null,
            light: light ?? null,
            rssi: rssi ?? null,
            snr: snr ?? null,
            source: 'lorawan',
          },
        });
      }

      await tx.deviceEvent.create({
        data: { deviceId: record.id, ts: eventTime, payload: body as Prisma.InputJsonObject },
      });
      return record;
    });

    console.info('[Ingest]', { requestId, source: 'lorawan', status: 201, durationMs: Date.now() - startedAt });
    return NextResponse.json({ success: true, deviceId: device.id, requestId }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, requestId }, { status: error.status });
    }
    console.error('[Ingest]', { requestId, source: 'lorawan', status: 500, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: 'Internal Server Error', requestId }, { status: 500 });
  }
}
