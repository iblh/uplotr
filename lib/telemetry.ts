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

function addMetrics(
  target: Record<string, PrimitiveMetric>,
  priorities: Map<string, number>,
  source: unknown,
  priority: number,
  includeReserved = true,
) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return;

  for (const [rawKey, value] of Object.entries(source)) {
    const key = rawKey.trim().slice(0, 64);
    if (!key || (!includeReserved && RESERVED_FIELDS.has(key))) continue;
    const metric = asMetric(value);
    if (metric === undefined) continue;

    const currentPriority = priorities.get(key);
    if (currentPriority !== undefined) {
      if (priority >= currentPriority) {
        target[key] = metric;
        priorities.set(key, priority);
      }
      continue;
    }

    if (priorities.size >= 32) {
      const replaceable = priorities.entries().find(([, existingPriority]) => existingPriority < priority);
      if (!replaceable) continue;
      delete target[replaceable[0]];
      priorities.delete(replaceable[0]);
    }
    target[key] = metric;
    priorities.set(key, priority);
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
  const priorities = new Map<string, number>();
  addMetrics(metrics, priorities, payload, 0, false);
  addMetrics(metrics, priorities, payload.metrics, 1, true);
  addMetrics(metrics, priorities, mappedCustom, 2, true);
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}
