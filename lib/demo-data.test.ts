import { describe, expect, it } from 'vitest';
import { demoDevices, demoPositionsByDevice, getRouteStats, landingPreviewPositions } from './demo-data';

describe('synthetic demo routes', () => {
  it('provides multiple substantial, non-linear routes', () => {
    expect(demoDevices).toHaveLength(3);

    for (const device of demoDevices) {
      const positions = demoPositionsByDevice[device.id];
      const first = positions[0];
      const middle = positions[Math.floor(positions.length / 3)];
      const later = positions[Math.floor((positions.length * 2) / 3)];
      const last = positions.at(-1)!;
      const crossProduct =
        (middle.lon - first.lon) * (later.lat - first.lat)
        - (middle.lat - first.lat) * (later.lon - first.lon);

      expect(positions.length).toBeGreaterThan(60);
      expect(Math.abs(crossProduct)).toBeGreaterThan(0.000001);
      expect(device.lastLat).toBe(last.lat);
      expect(device.lastLon).toBe(last.lon);
      expect(device.lastBattery).toBe(last.battery);
    }
  });

  it('keeps route summaries within plausible demo ranges', () => {
    for (const positions of Object.values(demoPositionsByDevice)) {
      const stats = getRouteStats(positions);
      expect(stats.distanceKm).toBeGreaterThan(3);
      expect(stats.durationMinutes).toBeGreaterThan(20);
      expect(stats.averageSpeedKph).toBeGreaterThan(2);
      expect(stats.averageSpeedKph).toBeLessThan(40);
      expect(stats.batteryUsed).toBeGreaterThan(0);
    }
  });

  it('uses a broad route for the landing preview', () => {
    const latitudes = landingPreviewPositions.map((position) => position.lat);
    const longitudes = landingPreviewPositions.map((position) => position.lon);

    expect(landingPreviewPositions).toHaveLength(49);
    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(0.06);
    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeGreaterThan(0.09);
  });
});
