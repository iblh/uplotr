import { describe, expect, it } from 'vitest';
import { analyzeRun, compareRunCompatibility, compareRuns } from './run-analysis';

describe('field test run analysis', () => {
  it('calculates route statistics and arbitrary telemetry summaries', () => {
    const analysis = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 37.7749, lon: -122.4194, battery: 95, metrics: { altitude: 10, voltage: 4.1 } },
      { ts: '2026-09-04T10:01:00Z', lat: 37.7759, lon: -122.4194, battery: 94, metrics: { altitude: 14, voltage: 4.0 } },
      { ts: '2026-09-04T10:02:00Z', lat: 37.7769, lon: -122.4194, battery: 93, metrics: { altitude: 12, voltage: 3.9 } },
    ]);

    expect(analysis.samples).toBe(3);
    expect(analysis.distanceKm).toBeGreaterThan(0.2);
    expect(analysis.durationMinutes).toBe(2);
    expect(analysis.batteryUsed).toBe(2);
    expect(analysis.qualityScore).toBe(100);
    expect(analysis.metrics.find((metric) => metric.key === 'altitude')).toMatchObject({ min: 10, max: 14, average: 12 });
  });

  it('flags large gaps, impossible jumps, and duplicate timestamps', () => {
    const analysis = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 0, lon: 0 },
      { ts: '2026-09-04T10:00:00Z', lat: 0, lon: 0 },
      { ts: '2026-09-04T10:01:00Z', lat: 1, lon: 1 },
      { ts: '2026-09-04T11:00:00Z', lat: 1.01, lon: 1.01 },
    ]);

    expect(analysis.qualityScore).toBeLessThan(100);
    expect(analysis.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(['LONG_GAP', 'POSSIBLE_JUMP', 'DUPLICATE_TIMESTAMP']),
    );
  });

  it('uses an explicitly configured cadence to detect shorter outages', () => {
    const analysis = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 37, lon: -122 },
      { ts: '2026-09-04T10:00:02Z', lat: 37, lon: -122 },
      { ts: '2026-09-04T10:01:02Z', lat: 37, lon: -122 },
    ], { expectedIntervalSeconds: 2 });

    expect(analysis.diagnostics.map((item) => item.code)).toContain('LONG_GAP');
  });

  it('compares two deterministic summaries', () => {
    const left = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 0, lon: 0, battery: 90 },
      { ts: '2026-09-04T10:01:00Z', lat: 0, lon: 0.001, battery: 88 },
    ]);
    const right = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 0, lon: 0, battery: 90 },
      { ts: '2026-09-04T10:01:00Z', lat: 0, lon: 0.002, battery: 89 },
    ]);

    expect(compareRuns(left, right).distanceDeltaKm).toBeGreaterThan(0);
    expect(compareRuns(left, right).batteryUsedDelta).toBe(-1);
    expect(compareRunCompatibility(left, right).status).toBe('PARTIAL');
  });

  it('summarizes flight telemetry and rejects incomplete comparisons', () => {
    const flight = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 37, lon: -122, metrics: { altitude: 12, ground_speed_mps: 5, gps_satellites: 10 } },
      { ts: '2026-09-04T10:00:02Z', lat: 37.0001, lon: -122, metrics: { altitude: 20, ground_speed_mps: 8, gps_satellites: 9 } },
      { ts: '2026-09-04T10:00:04Z', lat: 37.0002, lon: -122, metrics: { altitude: 18, ground_speed_mps: 7, gps_satellites: 5 } },
    ], { activityType: 'FLIGHT', minSamples: 3, expectedIntervalSeconds: 2 });

    expect(flight.flight).toMatchObject({
      minAltitudeM: 12,
      maxAltitudeM: 20,
      altitudeGainM: 8,
      minGpsSatellites: 5,
    });
    expect(flight.flight?.maxGroundSpeedKph).toBe(28.8);
    expect(flight.diagnostics.map((item) => item.code)).toContain('LOW_GPS_SATELLITES');

    const incomplete = analyzeRun([
      { ts: '2026-09-04T10:00:00Z', lat: 37, lon: -122 },
    ]);
    expect(compareRunCompatibility(incomplete, flight).status).toBe('INVALID');
  });
});
