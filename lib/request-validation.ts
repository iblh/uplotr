export const MAX_INGEST_BODY_BYTES = 128 * 1024;

export async function readJsonBody<T>(req: Request, maxBytes = MAX_INGEST_BODY_BYTES): Promise<T> {
  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new RequestValidationError('Payload too large', 413);

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestValidationError('Payload too large', 413);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestValidationError('Invalid JSON payload', 400);
  }
}

export class RequestValidationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function validateDeviceId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) {
    throw new RequestValidationError('device_id must be a string between 1 and 128 characters');
  }
  return value;
}

export function optionalFiniteNumber(value: unknown, name: string): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new RequestValidationError(`${name} must be a finite number`);
  return parsed;
}

export function validateCoordinates(latValue: unknown, lonValue: unknown): { lat: number; lon: number } {
  const lat = optionalFiniteNumber(latValue, 'lat');
  const lon = optionalFiniteNumber(lonValue, 'lon');
  if (lat === undefined || lon === undefined) {
    throw new RequestValidationError('Missing required fields: lat, lon (or mapping failed)');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new RequestValidationError('Coordinates are outside valid latitude/longitude ranges');
  }
  return { lat, lon };
}

export function parseEventTime(value: unknown): Date {
  if (value === null || value === undefined || value === '') return new Date();
  const candidate = typeof value === 'number' && value < 100_000_000_000
    ? new Date(value * 1000)
    : new Date(value as string | number);
  if (Number.isNaN(candidate.getTime())) throw new RequestValidationError('Invalid timestamp');
  const minimum = Date.UTC(2000, 0, 1);
  const maximum = Date.now() + 24 * 60 * 60 * 1000;
  if (candidate.getTime() < minimum || candidate.getTime() > maximum) {
    throw new RequestValidationError('Timestamp is outside the supported range');
  }
  return candidate;
}

export function validateBattery(value: unknown): number | undefined {
  const battery = optionalFiniteNumber(value, 'battery');
  if (battery !== undefined && (battery < 0 || battery > 100)) {
    throw new RequestValidationError('battery must be between 0 and 100');
  }
  return battery;
}
