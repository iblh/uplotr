import { prisma } from './prisma';

/**
 * Smart Date Parser
 * Handles: ISO strings (including nanoseconds), Epoch (sec/ms), 'yyyyMMdd'
 */
export function smartParseDate(val: any): Date | null {
  if (!val) return null;

  // 1. If it's already a Date
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // 2. Handle Numbers (Epoch)
  if (typeof val === 'number') {
    // Guess if seconds or milliseconds
    // If < 10^11, it's likely seconds (valid until year 5138)
    if (val < 100000000000) return new Date(val * 1000);
    return new Date(val);
  }

  if (typeof val === 'string') {
    // 3. Handle High Precision ISO (e.g. 2024-01-01T00:00:00.123456789Z)
    // Javascript Date only supports milliseconds, so we truncate nanoseconds
    const isoNanoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:?\d{2})?$/;
    const match = val.match(isoNanoRegex);
    if (match) {
      const ms = match[2].substring(0, 3); // Take first 3 digits of fractional part
      const reconstructed = `${match[1]}.${ms}${match[3] || ''}`;
      return new Date(reconstructed);
    }

    // 4. Handle 'yyyyMMdd' format (common in some trackers)
    if (/^\d{8}$/.test(val)) {
      const y = val.substring(0, 4);
      const m = val.substring(4, 6);
      const d = val.substring(6, 8);
      return new Date(`${y}-${m}-${d}`);
    }

    // 5. Standard ISO or other string formats
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Robust JSONPath-like value extractor
 * Supports dot notation and [n] array index.
 */
export function getValueByPath(obj: any, path: string): any {
  if (!path || !obj || path === '$') return undefined;

  // Normalize path: replace [n] with .n
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
  const parts = cleanPath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(p => p !== '');

  return parts.reduce((prev, curr) => {
    if (prev === null || prev === undefined) return undefined;
    return prev[curr];
  }, obj);
}

/**
 * Field Candidate Mapping for Auto-Discovery
 */
const FIELD_CANDIDATES = {
  lat: ['Latitude', 'latitude', 'lat', 'gps_lat', 'Location.lat', 'location.lat'],
  lon: ['Longitude', 'longitude', 'lon', 'gps_lng', 'Location.lon', 'location.lon'],
  ts: ['timestamp_ms', 'time', 'timestamp', 'received_at', 'reported_at', 'ts'],
  battery: ['Battery', 'battery', 'bat', 'battery_level', 'vbat'],
  rssi: ['rssi', 'last_rssi'],
  snr: ['snr', 'last_snr'],
  temp: ['Air_Temperature', 'temperature', 'temp', 'ambient_temp'],
  light: ['Light', 'lux', 'illuminance', 'light_level']
};

/**
 * Recursive path discoverer
 */
function searchPath(obj: any, candidates: string[], currentPath: string = '$'): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // 1. Check direct keys first
  for (const key of Object.keys(obj)) {
    if (candidates.some(c => c.toLowerCase() === key.toLowerCase())) {
      return `${currentPath}.${key}`;
    }
  }

  // 2. Special handling for common wrappers like rxInfo[0]
  if (Array.isArray(obj.rxInfo) && obj.rxInfo.length > 0) {
    const found = searchPath(obj.rxInfo[0], candidates, `${currentPath}.rxInfo[0]`);
    if (found) return found;
  }

  // 3. Check important sub-objects (depth-limited for performance)
  const priorities = ['object', 'decoded', 'uplink_message', 'decoded_payload', 'deviceInfo'];
  for (const key of priorities) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = searchPath(obj[key], candidates, `${currentPath}.${key}`);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Discovers the best matching JSONPaths for a given payload
 */
export function discoverPaths(payload: any) {
  const result: Record<string, string> = {};

  for (const [field, candidates] of Object.entries(FIELD_CANDIDATES)) {
    const found = searchPath(payload, candidates);
    if (found) result[`${field}Path`] = found;
  }

  return result;
}

/**
 * Try to map a raw payload using dynamic mapper
 */
export async function tryMapPayload(externalId: string, payload: any, deviceType?: string | null) {
  // 1. Find device and its mapper
  const device = await prisma.device.findFirst({
    where: {
      OR: [
        { externalId: externalId },
        { id: externalId } // fallback if UUID is passed
      ]
    },
    include: { mapper: true }
  });

  // 2. If no mapper assigned, use Auto-Discovery as default behavior
  const effectiveMapper = device?.mapper || discoverPaths(payload);

  if (!effectiveMapper) return null;

  const lat = getValueByPath(payload, effectiveMapper.latPath || '');
  const lon = getValueByPath(payload, effectiveMapper.lonPath || '');
  const tsRaw = getValueByPath(payload, effectiveMapper.tsPath || '');
  const battery = getValueByPath(payload, effectiveMapper.batteryPath || '');
  const rssi = getValueByPath(payload, effectiveMapper.rssiPath || '');
  const snr = getValueByPath(payload, effectiveMapper.snrPath || '');
  const temp = getValueByPath(payload, effectiveMapper.tempPath || '');
  const light = getValueByPath(payload, effectiveMapper.lightPath || '');

  // Extract custom fields if any
  const custom: Record<string, any> = {};
  if (effectiveMapper.customFields && typeof effectiveMapper.customFields === 'object') {
    for (const [key, path] of Object.entries(effectiveMapper.customFields)) {
      if (typeof path === 'string') {
        const val = getValueByPath(payload, path);
        if (val !== undefined) {
          custom[key] = val;
        }
      }
    }
  }

  return {
    lat: lat !== undefined ? Number(lat) : undefined,
    lon: lon !== undefined ? Number(lon) : undefined,
    ts: smartParseDate(tsRaw),
    battery: battery !== undefined ? Number(battery) : undefined,
    rssi: rssi !== undefined ? Number(rssi) : undefined,
    snr: snr !== undefined ? Number(snr) : undefined,
    temp: temp !== undefined ? Number(temp) : undefined,
    light: light !== undefined ? Number(light) : undefined,
    custom: Object.keys(custom).length > 0 ? custom : undefined
  };
}
