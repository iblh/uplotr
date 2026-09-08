import type { Prisma } from '@prisma/client';

const RESERVED_FIELDS = new Set([
  'device_id', 'deviceId', 'id', 'lat', 'latitude', 'lon', 'lng', 'longitude',
  'timestamp', 'time', 'ts', 'type', 'source', 'battery', 'bat', 'batteryLevel',
  'temp', 'temperature', 'light', 'lux', 'rssi', 'snr', 'metrics',
]);

type PrimitiveMetric = string | number | boolean;

function asMetric(value: unknown): PrimitiveMetric | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length <= 160 ? value : value.slice(0, 160);
  return undefined;
}

function addMetrics(target: Record<string, PrimitiveMetric>, source: unknown, includeReserved = true) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return;

  for (const [rawKey, value] of Object.entries(source)) {
    if (Object.keys(target).length >= 32) break;
    const key = rawKey.trim().slice(0, 64);
    if (!key || (!includeReserved && RESERVED_FIELDS.has(key))) continue;
    const metric = asMetric(value);
    if (metric !== undefined) target[key] = metric;
  }
}

/**
 * Keeps maker-defined telemetry small, flat, and JSON-safe. Explicit `metrics`
 * and mapper fields win over automatically captured top-level primitives.
 */
export function extractTelemetryMetrics(
  payload: Record<string, unknown>,
  mappedCustom?: Record<string, unknown>,
): Prisma.InputJsonObject | undefined {
  const metrics: Record<string, PrimitiveMetric> = {};
  addMetrics(metrics, payload, false);
  addMetrics(metrics, payload.metrics, true);
  addMetrics(metrics, mappedCustom, true);
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}
