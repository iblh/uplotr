import type { Prisma } from '@prisma/client';

export const FLIGHT_LOG_FORMATS = [
  'AUTO',
  'GENERIC_CSV',
  'ARDUPILOT_CSV',
  'PX4_CSV',
  'BETAFLIGHT_CSV',
  'GPX',
] as const;

export type FlightLogFormat = (typeof FLIGHT_LOG_FORMATS)[number];

export interface FlightLogPoint {
  ts: Date;
  lat: number;
  lon: number;
  battery: number | null;
  metrics: Prisma.InputJsonObject;
}

export interface ParsedFlightLog {
  format: Exclude<FlightLogFormat, 'AUTO'>;
  points: FlightLogPoint[];
  detectedFields: string[];
}

const MAX_POINTS = 10_000;
const MAX_METRICS = 32;

const aliases = {
  timestamp: ['timestamp', 'datetime', 'date_time', 'utc_time', 'time', 'timeus', 'time_us', 'time_ms', 'timestamp_us', 'timestamp_ms'],
  lat: ['lat', 'latitude', 'gps_lat', 'gps_latitude', 'lat_deg'],
  lon: ['lon', 'lng', 'longitude', 'gps_lon', 'gps_longitude', 'lon_deg'],
  altitude: ['altitude', 'alt', 'alt_m', 'relative_alt', 'relative_altitude', 'relalt', 'gps_alt', 'baro_alt'],
  groundSpeed: ['ground_speed', 'groundspeed', 'speed', 'speed_mps', 'gps_speed', 'velocity'],
  verticalSpeed: ['vertical_speed', 'verticalspeed', 'climb', 'climb_rate', 'vz'],
  heading: ['heading', 'course', 'yaw', 'hdg'],
  roll: ['roll', 'roll_deg'],
  pitch: ['pitch', 'pitch_deg'],
  yaw: ['yaw', 'yaw_deg'],
  satellites: ['satellites', 'gps_satellites', 'satellites_visible', 'sats', 'nsats'],
  voltage: ['voltage', 'battery_voltage', 'vbat', 'volt'],
  current: ['current', 'battery_current', 'current_a', 'amperage'],
  battery: ['battery_percent', 'battery_remaining', 'remaining_percent', 'battery', 'battery_level'],
  rssi: ['rssi', 'signal_strength', 'rx_rssi'],
  snr: ['snr', 'signal_to_noise'],
} as const;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function detectDelimiter(header: string): string {
  const options = [',', '\t', ';'];
  return options.reduce((best, candidate) => (
    header.split(candidate).length > header.split(best).length ? candidate : best
  ), ',');
}

function finiteNumber(value: string | undefined): number | null {
  if (!value) return null;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

function findColumn(headers: string[], candidates: readonly string[]): number {
  return candidates.map((candidate) => headers.indexOf(candidate)).find((index) => index >= 0) ?? -1;
}

function coordinate(value: number, latitude: boolean): number {
  const limit = latitude ? 90 : 180;
  if (Math.abs(value) <= limit) return value;
  const scaled = value / 10_000_000;
  if (Math.abs(scaled) <= limit) return scaled;
  throw new Error(`Invalid ${latitude ? 'latitude' : 'longitude'} in flight log`);
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function inferFormat(filename: string, requested: FlightLogFormat): Exclude<FlightLogFormat, 'AUTO'> {
  if (requested !== 'AUTO') return requested;
  return filename.toLowerCase().endsWith('.gpx') ? 'GPX' : 'GENERIC_CSV';
}

function parseTimestamp(raw: string | undefined, header: string, relativeBaseMs: number): Date | null {
  if (!raw) return null;
  const numeric = finiteNumber(raw);
  if (numeric !== null) {
    if (numeric > 1e15) return new Date(numeric / 1000);
    if (numeric > 1e12) return new Date(numeric);
    if (numeric > 1e9) return new Date(numeric * 1000);
    const milliseconds = header.includes('us') ? numeric / 1000 : header.includes('ms') ? numeric : numeric * 1000;
    return new Date(relativeBaseMs + milliseconds);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function setMetric(target: Record<string, number | string | boolean>, key: string, value: number | null) {
  if (value !== null && Number.isFinite(value) && Object.keys(target).length < MAX_METRICS) {
    target[key] = value;
  }
}

function parseCsv(content: string, format: Exclude<FlightLogFormat, 'AUTO' | 'GPX'>): ParsedFlightLog {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('Flight log CSV must include a header and at least one data row');
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvRow(lines[0], delimiter).map(normalizeHeader);
  const timestampIndex = findColumn(headers, aliases.timestamp);
  const latitudeIndex = findColumn(headers, aliases.lat);
  const longitudeIndex = findColumn(headers, aliases.lon);
  if (latitudeIndex < 0 || longitudeIndex < 0) {
    throw new Error('Flight log must include latitude and longitude columns');
  }

  const knownColumns = {
    altitude: findColumn(headers, aliases.altitude),
    ground_speed_mps: findColumn(headers, aliases.groundSpeed),
    vertical_speed_mps: findColumn(headers, aliases.verticalSpeed),
    heading_deg: findColumn(headers, aliases.heading),
    roll_deg: findColumn(headers, aliases.roll),
    pitch_deg: findColumn(headers, aliases.pitch),
    yaw_deg: findColumn(headers, aliases.yaw),
    gps_satellites: findColumn(headers, aliases.satellites),
    voltage: findColumn(headers, aliases.voltage),
    current_a: findColumn(headers, aliases.current),
    rssi: findColumn(headers, aliases.rssi),
    snr: findColumn(headers, aliases.snr),
  };
  const batteryIndex = findColumn(headers, aliases.battery);
  const numericRows = lines.slice(1, MAX_POINTS + 1).map((line) => splitCsvRow(line, delimiter));
  const relativeValues = timestampIndex >= 0
    ? numericRows.map((row) => finiteNumber(row[timestampIndex])).filter((value): value is number => value !== null && value < 1e9)
    : [];
  const relativeHeader = timestampIndex >= 0 ? headers[timestampIndex] : '';
  const lastRelative = relativeValues.at(-1) ?? 0;
  const relativeDurationMs = relativeHeader.includes('us')
    ? lastRelative / 1000
    : relativeHeader.includes('ms')
      ? lastRelative
      : lastRelative * 1000;
  const relativeBaseMs = Date.now() - Math.max(0, relativeDurationMs);
  const fallbackStartMs = relativeBaseMs;

  const points = numericRows.flatMap((row, index): FlightLogPoint[] => {
    const rawLat = finiteNumber(row[latitudeIndex]);
    const rawLon = finiteNumber(row[longitudeIndex]);
    if (rawLat === null || rawLon === null) return [];
    const metrics: Record<string, number | string | boolean> = {};
    for (const [key, columnIndex] of Object.entries(knownColumns)) {
      if (columnIndex >= 0) setMetric(metrics, key, finiteNumber(row[columnIndex]));
    }

    const reserved = new Set([
      timestampIndex,
      latitudeIndex,
      longitudeIndex,
      batteryIndex,
      ...Object.values(knownColumns),
    ]);
    for (let columnIndex = 0; columnIndex < headers.length && Object.keys(metrics).length < MAX_METRICS; columnIndex += 1) {
      if (reserved.has(columnIndex) || !headers[columnIndex]) continue;
      setMetric(metrics, headers[columnIndex], finiteNumber(row[columnIndex]));
    }

    const parsedTimestamp = timestampIndex >= 0
      ? parseTimestamp(row[timestampIndex], headers[timestampIndex], relativeBaseMs)
      : null;
    const battery = batteryIndex >= 0 ? finiteNumber(row[batteryIndex]) : null;
    return [{
      ts: parsedTimestamp ?? new Date(fallbackStartMs + index * 1000),
      lat: coordinate(rawLat, true),
      lon: coordinate(rawLon, false),
      battery: battery === null || battery < 0 || battery > 100 ? null : Math.round(battery),
      metrics,
    }];
  });

  if (points.length === 0) throw new Error('No valid GPS points were found in the flight log');
  return {
    format,
    points: points.sort((a, b) => a.ts.getTime() - b.ts.getTime()),
    detectedFields: Object.keys(knownColumns).filter((key) => knownColumns[key as keyof typeof knownColumns] >= 0),
  };
}

function childValue(fragment: string, names: string[]): number | null {
  for (const name of names) {
    const match = fragment.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]+)</${name}>`, 'i'));
    const value = finiteNumber(match ? decodeXml(match[1]) : undefined);
    if (value !== null) return value;
  }
  return null;
}

function parseGpx(content: string): ParsedFlightLog {
  const points: FlightLogPoint[] = [];
  const matcher = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(content)) && points.length < MAX_POINTS) {
    const latMatch = match[1].match(/\blat=["']([^"']+)["']/i);
    const lonMatch = match[1].match(/\blon=["']([^"']+)["']/i);
    const lat = finiteNumber(latMatch?.[1]);
    const lon = finiteNumber(lonMatch?.[1]);
    if (lat === null || lon === null) continue;
    const timeMatch = match[2].match(/<time(?:\s[^>]*)?>([^<]+)<\/time>/i);
    const parsedTime = timeMatch ? new Date(decodeXml(timeMatch[1])) : null;
    const metrics: Record<string, number> = {};
    setMetric(metrics, 'altitude', childValue(match[2], ['ele', 'altitude']));
    setMetric(metrics, 'ground_speed_mps', childValue(match[2], ['speed', 'groundsSpeed', 'ground_speed']));
    setMetric(metrics, 'heading_deg', childValue(match[2], ['course', 'heading']));
    setMetric(metrics, 'gps_satellites', childValue(match[2], ['sat', 'satellites']));
    points.push({
      ts: parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : new Date(Date.now() + points.length * 1000),
      lat: coordinate(lat, true),
      lon: coordinate(lon, false),
      battery: null,
      metrics,
    });
  }
  if (points.length === 0) throw new Error('No GPX track points were found');
  return {
    format: 'GPX',
    points: points.sort((a, b) => a.ts.getTime() - b.ts.getTime()),
    detectedFields: ['altitude'],
  };
}

export function parseFlightLog(
  content: string,
  filename: string,
  requestedFormat: FlightLogFormat = 'AUTO',
): ParsedFlightLog {
  if (!content.trim()) throw new Error('Flight log is empty');
  const format = inferFormat(filename, requestedFormat);
  return format === 'GPX' ? parseGpx(content) : parseCsv(content, format);
}
