import { describe, expect, it } from 'vitest';
import { extractTelemetryMetrics } from './telemetry';

describe('custom telemetry extraction', () => {
  it('keeps explicit, mapped, and safe top-level primitive metrics', () => {
    expect(extractTelemetryMetrics(
      {
        device_id: 'tracker-01',
        lat: 37,
        lon: -122,
        voltage: 4.08,
        state: 'moving',
        nested: { ignored: true },
        metrics: { altitude: 32, gps_fix: true },
      },
      { radiation: 0.12 },
    )).toEqual({
      voltage: 4.08,
      state: 'moving',
      altitude: 32,
      gps_fix: true,
      radiation: 0.12,
    });
  });

  it('ignores non-finite, nested, reserved, and oversized values', () => {
    const metrics = extractTelemetryMetrics({
      battery: 90,
      invalid: Number.NaN,
      nested: { value: 1 },
      label: 'x'.repeat(200),
    });
    expect(metrics).toEqual({ label: 'x'.repeat(160) });
  });

  it('reserves the metric budget for explicit and mapped telemetry', () => {
    const automatic = Object.fromEntries(
      Array.from({ length: 32 }, (_, index) => [`automatic_${index}`, index]),
    );
    const metrics = extractTelemetryMetrics({
      ...automatic,
      metrics: { altitude: 42 },
    }, { radiation: 0.12 });

    expect(Object.keys(metrics ?? {})).toHaveLength(32);
    expect(metrics).toMatchObject({ altitude: 42, radiation: 0.12 });
  });
});
