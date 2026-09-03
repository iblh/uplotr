import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const integrationSuite = databaseUrl ? describe : describe.skip;

integrationSuite('Postgres migration compatibility', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let findApiKey: typeof import('@/lib/api-key').findApiKey;
  let consumeRateLimit: typeof import('@/lib/rate-limit').consumeRateLimit;
  let ingest: typeof import('@/app/api/v1/ingest/route').POST;
  let ingestLorawan: typeof import('@/app/api/lorawan/webhook/route').POST;
  const suffix = randomUUID();
  const deviceId = `integration-${suffix}`;
  const legacyKey = `upl_legacy_${suffix}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    ({ prisma } = await import('@/lib/prisma'));
    ({ findApiKey } = await import('@/lib/api-key'));
    ({ consumeRateLimit } = await import('@/lib/rate-limit'));
    ({ POST: ingest } = await import('@/app/api/v1/ingest/route'));
    ({ POST: ingestLorawan } = await import('@/app/api/lorawan/webhook/route'));
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({ where: { name: `integration-${suffix}` } });
    await prisma.device.deleteMany({ where: { externalId: { startsWith: `integration-${suffix}` } } });
    await prisma.$disconnect();
  });

  it('keeps legacy API keys working while backfilling the hash', async () => {
    const created = await prisma.apiKey.create({
      data: { name: `integration-${suffix}`, key: legacyKey },
    });

    await expect(findApiKey(legacyKey)).resolves.toEqual({ id: created.id });
    const migrated = await prisma.apiKey.findUniqueOrThrow({ where: { id: created.id } });
    expect(migrated.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(migrated.prefix).toContain('…');
  });

  it('cascades positions and events when a device is deleted', async () => {
    await prisma.device.create({
      data: {
        id: deviceId,
        externalId: deviceId,
        tags: [],
        lastSeen: new Date(),
        positions: { create: { ts: new Date(), lat: 37, lon: -122 } },
        events: { create: { payload: { source: 'integration-test' } } },
      },
    });

    await prisma.device.delete({ where: { id: deviceId } });
    await expect(prisma.position.count({ where: { deviceId } })).resolves.toBe(0);
    await expect(prisma.deviceEvent.count({ where: { deviceId } })).resolves.toBe(0);
  });

  it('enforces a limit atomically across concurrent requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit('integration', suffix, 3, 60_000)),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => !result.allowed)).toHaveLength(7);
  });

  it('records concurrent first HTTP packets without losing either event', async () => {
    const externalId = `integration-${suffix}-http-race`;
    const earlier = '2026-09-03T10:00:00.000Z';
    const later = '2026-09-03T10:01:00.000Z';
    const responses = await Promise.all([
      ingest(new NextRequest('http://localhost/api/v1/ingest', {
        method: 'POST',
        headers: { authorization: `Bearer ${legacyKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: externalId, lat: 37.1, lon: -122.1, timestamp: earlier }),
      })),
      ingest(new NextRequest('http://localhost/api/v1/ingest', {
        method: 'POST',
        headers: { authorization: `Bearer ${legacyKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: externalId, lat: 37.2, lon: -122.2, timestamp: later }),
      })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const device = await prisma.device.findUniqueOrThrow({ where: { externalId } });
    await expect(prisma.position.count({ where: { deviceId: device.id } })).resolves.toBe(2);
    await expect(prisma.deviceEvent.count({ where: { deviceId: device.id } })).resolves.toBe(2);
    expect(device.lastSeen.toISOString()).toBe(later);
    expect(device.lastLat).toBe(37.2);
  });

  it('records concurrent first LoRaWAN packets without losing either event', async () => {
    const externalId = `integration-${suffix}-lorawan-race`;
    const earlier = '2026-09-03T11:00:00.000Z';
    const later = '2026-09-03T11:01:00.000Z';
    const makeRequest = (receivedAt: string, latitude: number) => new NextRequest(
      'http://localhost/api/lorawan/webhook',
      {
        method: 'POST',
        headers: { authorization: `Bearer ${legacyKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          end_device_ids: { dev_eui: externalId, device_id: 'Integration node' },
          received_at: receivedAt,
          uplink_message: { decoded_payload: { latitude, longitude: -122.3 } },
        }),
      },
    );
    const responses = await Promise.all([
      ingestLorawan(makeRequest(earlier, 37.3)),
      ingestLorawan(makeRequest(later, 37.4)),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const device = await prisma.device.findUniqueOrThrow({ where: { externalId } });
    await expect(prisma.position.count({ where: { deviceId: device.id } })).resolves.toBe(2);
    await expect(prisma.deviceEvent.count({ where: { deviceId: device.id } })).resolves.toBe(2);
    expect(device.lastSeen.toISOString()).toBe(later);
    expect(device.lastLat).toBe(37.4);
  });
});
