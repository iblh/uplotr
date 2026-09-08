export interface AnalysisPosition {
  ts: Date | string;
  lat: number;
  lon: number;
  battery?: number | null;
  metrics?: unknown;
}

export interface MetricSummary {
  key: string;
  samples: number;
  min: number;
  max: number;
  average: number;
  latest: number;
}

export interface RunDiagnostic {
  severity: 'info' | 'warning';
  code: 'INSUFFICIENT_DATA' | 'LONG_GAP' | 'POSSIBLE_JUMP' | 'DUPLICATE_TIMESTAMP' | 'LOW_GPS_SATELLITES';
  message: string;
  count?: number;
}

export interface FlightAnalysis {
  minAltitudeM: number | null;
  maxAltitudeM: number | null;
  altitudeGainM: number;
  maxGroundSpeedKph: number;
  maxVerticalSpeedMps: number;
  maxDistanceFromHomeKm: number;
  minGpsSatellites: number | null;
}

export interface RunAnalysisOptions {
  activityType?: 'GROUND' | 'FLIGHT' | string;
  expectedIntervalSeconds?: number | null;
  minSamples?: number | null;
}

export interface RunAnalysis {
  samples: number;
  durationMinutes: number;
  distanceKm: number;
  averageSpeedKph: number;
  maxSegmentSpeedKph: number;
  batteryUsed: number | null;
  medianIntervalSeconds: number | null;
  largestGapSeconds: number | null;
  qualityScore: number;
  diagnostics: RunDiagnostic[];
  metrics: MetricSummary[];
  flight: FlightAnalysis | null;
}

export interface RunCompatibility {
  status: 'COMPARABLE' | 'PARTIAL' | 'INVALID';
  score: number;
  reasons: string[];
}

const toRadians = (value: number) => value * Math.PI / 180;

export function distanceBetweenKm(a: AnalysisPosition, b: AnalysisPosition): number {
  const radiusKm = 6371;
  const latDelta = toRadians(b.lat - a.lat);
  const lonDelta = toRadians(b.lon - a.lon);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(haversine));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function numericMetrics(positions: AnalysisPosition[]): MetricSummary[] {
  const values = new Map<string, number[]>();
  for (const position of positions) {
    if (!position.metrics || typeof position.metrics !== 'object' || Array.isArray(position.metrics)) continue;
    for (const [key, value] of Object.entries(position.metrics)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const current = values.get(key) ?? [];
      current.push(value);
      values.set(key, current);
    }
  }

  return [...values.entries()].map(([key, samples]) => ({
    key,
    samples: samples.length,
    min: Math.min(...samples),
    max: Math.max(...samples),
    average: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    latest: samples.at(-1)!,
  })).sort((a, b) => a.key.localeCompare(b.key));
}

function metricNumber(position: AnalysisPosition, keys: string[]): number | null {
  if (!position.metrics || typeof position.metrics !== 'object' || Array.isArray(position.metrics)) return null;
  const metrics = position.metrics as Record<string, unknown>;
  for (const key of keys) {
    const value = metrics[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function analyzeFlight(positions: AnalysisPosition[], segmentSpeeds: number[]): FlightAnalysis {
  const altitudes = positions.map((position) => metricNumber(position, ['altitude', 'altitude_m', 'relative_altitude']));
  const validAltitudes = altitudes.filter((value): value is number => value !== null);
  const suppliedGroundSpeeds = positions
    .map((position) => metricNumber(position, ['ground_speed_mps', 'speed_mps']))
    .filter((value): value is number => value !== null)
    .map((value) => value * 3.6);
  const suppliedVerticalSpeeds = positions
    .map((position) => metricNumber(position, ['vertical_speed_mps', 'climb_rate']))
    .filter((value): value is number => value !== null)
    .map(Math.abs);
  const derivedVerticalSpeeds: number[] = [];
  let altitudeGainM = 0;
  for (let index = 1; index < positions.length; index += 1) {
    const previousAltitude = altitudes[index - 1];
    const currentAltitude = altitudes[index];
    if (previousAltitude === null || currentAltitude === null) continue;
    const delta = currentAltitude - previousAltitude;
    if (delta > 0) altitudeGainM += delta;
    const seconds = (new Date(positions[index].ts).getTime() - new Date(positions[index - 1].ts).getTime()) / 1000;
    if (seconds > 0) derivedVerticalSpeeds.push(Math.abs(delta / seconds));
  }
  const home = positions[0];
  const satellites = positions
    .map((position) => metricNumber(position, ['gps_satellites', 'satellites']))
    .filter((value): value is number => value !== null);

  return {
    minAltitudeM: validAltitudes.length > 0 ? Math.min(...validAltitudes) : null,
    maxAltitudeM: validAltitudes.length > 0 ? Math.max(...validAltitudes) : null,
    altitudeGainM,
    maxGroundSpeedKph: Math.max(0, ...suppliedGroundSpeeds, ...segmentSpeeds),
    maxVerticalSpeedMps: Math.max(0, ...suppliedVerticalSpeeds, ...derivedVerticalSpeeds),
    maxDistanceFromHomeKm: Math.max(0, ...positions.map((position) => distanceBetweenKm(home, position))),
    minGpsSatellites: satellites.length > 0 ? Math.min(...satellites) : null,
  };
}

export function analyzeRun(input: AnalysisPosition[], options: RunAnalysisOptions = {}): RunAnalysis {
  const positions = [...input].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );
  const diagnostics: RunDiagnostic[] = [];
  const minimumSamples = Math.max(2, options.minSamples ?? 2);

  if (positions.length < 2) {
    diagnostics.push({ severity: 'info', code: 'INSUFFICIENT_DATA', message: `Collect at least ${minimumSamples} positions to calculate trustworthy route quality.` });
    return {
      samples: positions.length,
      durationMinutes: 0,
      distanceKm: 0,
      averageSpeedKph: 0,
      maxSegmentSpeedKph: 0,
      batteryUsed: null,
      medianIntervalSeconds: null,
      largestGapSeconds: null,
      qualityScore: positions.length === 1 ? 50 : 0,
      diagnostics,
      metrics: numericMetrics(positions),
      flight: options.activityType === 'FLIGHT' ? analyzeFlight(positions, []) : null,
    };
  }

  const intervals: number[] = [];
  const speeds: number[] = [];
  let distanceKm = 0;
  let duplicateTimestamps = 0;

  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];
    const intervalSeconds = (new Date(current.ts).getTime() - new Date(previous.ts).getTime()) / 1000;
    const segmentDistance = distanceBetweenKm(previous, current);
    distanceKm += segmentDistance;
    if (intervalSeconds <= 0) {
      duplicateTimestamps += 1;
      continue;
    }
    intervals.push(intervalSeconds);
    speeds.push(segmentDistance / (intervalSeconds / 3600));
  }

  const durationMinutes = (
    new Date(positions.at(-1)!.ts).getTime() - new Date(positions[0].ts).getTime()
  ) / 60000;
  const medianIntervalSeconds = median(intervals);
  const largestGapSeconds = intervals.length > 0 ? Math.max(...intervals) : null;
  // Use the faster half of intervals as the expected cadence so a long outage
  // does not inflate its own detection threshold on short test runs.
  const cadenceSample = [...intervals]
    .sort((a, b) => a - b)
    .slice(0, Math.max(1, Math.ceil(intervals.length / 2)));
  const hasExplicitInterval = Boolean(options.expectedIntervalSeconds && options.expectedIntervalSeconds > 0);
  const expectedIntervalSeconds = hasExplicitInterval
    ? options.expectedIntervalSeconds
    : median(cadenceSample) ?? medianIntervalSeconds ?? 0;
  const gapThreshold = hasExplicitInterval
    ? expectedIntervalSeconds! * 2.5
    : Math.max(120, expectedIntervalSeconds! * 2.5);
  const longGaps = intervals.filter((seconds) => seconds > gapThreshold).length;
  const possibleJumps = speeds.filter((speed) => speed > 250).length;
  const insufficientSamples = positions.length < minimumSamples;
  const lowSatelliteSamples = options.activityType === 'FLIGHT'
    ? positions.filter((position) => {
        const satellites = metricNumber(position, ['gps_satellites', 'satellites']);
        return satellites !== null && satellites < 6;
      }).length
    : 0;

  if (insufficientSamples) diagnostics.push({ severity: 'warning', code: 'INSUFFICIENT_DATA', count: positions.length, message: `This run has ${positions.length} samples; the test protocol requires at least ${minimumSamples}.` });
  if (longGaps > 0) diagnostics.push({ severity: 'warning', code: 'LONG_GAP', count: longGaps, message: `${longGaps} reporting gap${longGaps === 1 ? '' : 's'} exceeded the expected interval.` });
  if (possibleJumps > 0) diagnostics.push({ severity: 'warning', code: 'POSSIBLE_JUMP', count: possibleJumps, message: `${possibleJumps} segment${possibleJumps === 1 ? '' : 's'} exceeded 250 km/h and may be GPS jumps.` });
  if (duplicateTimestamps > 0) diagnostics.push({ severity: 'warning', code: 'DUPLICATE_TIMESTAMP', count: duplicateTimestamps, message: `${duplicateTimestamps} duplicate timestamp${duplicateTimestamps === 1 ? '' : 's'} detected.` });
  if (lowSatelliteSamples > 0) diagnostics.push({ severity: 'warning', code: 'LOW_GPS_SATELLITES', count: lowSatelliteSamples, message: `${lowSatelliteSamples} flight sample${lowSatelliteSamples === 1 ? '' : 's'} reported fewer than 6 GPS satellites.` });

  const firstBattery = positions.find((position) => position.battery !== null && position.battery !== undefined)?.battery;
  const lastBattery = [...positions].reverse().find((position) => position.battery !== null && position.battery !== undefined)?.battery;
  const qualityScore = Math.max(0, Math.round(100
    - (insufficientSamples ? 50 : 0)
    - longGaps * 6
    - possibleJumps * 12
    - duplicateTimestamps * 4
    - lowSatelliteSamples * 2));

  return {
    samples: positions.length,
    durationMinutes,
    distanceKm,
    averageSpeedKph: durationMinutes > 0 ? distanceKm / (durationMinutes / 60) : 0,
    maxSegmentSpeedKph: speeds.length > 0 ? Math.max(...speeds) : 0,
    batteryUsed: firstBattery != null && lastBattery != null
      ? Math.max(0, firstBattery - lastBattery)
      : null,
    medianIntervalSeconds,
    largestGapSeconds,
    qualityScore,
    diagnostics,
    metrics: numericMetrics(positions),
    flight: options.activityType === 'FLIGHT' ? analyzeFlight(positions, speeds) : null,
  };
}

export function compareRunCompatibility(left: RunAnalysis, right: RunAnalysis): RunCompatibility {
  if (left.samples < 2 || right.samples < 2) {
    return { status: 'INVALID', score: 0, reasons: ['Both runs need at least two GPS samples.'] };
  }
  const reasons: string[] = [];
  let score = 100;
  const sampleRatio = Math.min(left.samples, right.samples) / Math.max(left.samples, right.samples);
  const distanceRatio = Math.min(left.distanceKm, right.distanceKm) / Math.max(left.distanceKm, right.distanceKm, 0.001);
  const durationRatio = Math.min(left.durationMinutes, right.durationMinutes) / Math.max(left.durationMinutes, right.durationMinutes, 0.001);
  if (sampleRatio < 0.5) {
    score -= 35;
    reasons.push('Sample counts differ by more than 2×.');
  }
  if (distanceRatio < 0.6) {
    score -= 35;
    reasons.push('Route distances differ too much for a direct comparison.');
  }
  if (durationRatio < 0.5) {
    score -= 20;
    reasons.push('Test durations differ by more than 2×.');
  }
  if (left.diagnostics.some((item) => item.code === 'INSUFFICIENT_DATA') || right.diagnostics.some((item) => item.code === 'INSUFFICIENT_DATA')) {
    score -= 40;
    reasons.push('At least one run does not meet its minimum sample requirement.');
  }
  const boundedScore = Math.max(0, score);
  return {
    status: boundedScore >= 85 ? 'COMPARABLE' : boundedScore >= 50 ? 'PARTIAL' : 'INVALID',
    score: boundedScore,
    reasons,
  };
}

export function compareRuns(left: RunAnalysis, right: RunAnalysis) {
  return {
    sampleDelta: right.samples - left.samples,
    distanceDeltaKm: right.distanceKm - left.distanceKm,
    durationDeltaMinutes: right.durationMinutes - left.durationMinutes,
    averageSpeedDeltaKph: right.averageSpeedKph - left.averageSpeedKph,
    qualityScoreDelta: right.qualityScore - left.qualityScore,
    batteryUsedDelta: left.batteryUsed === null || right.batteryUsed === null
      ? null
      : right.batteryUsed - left.batteryUsed,
  };
}
