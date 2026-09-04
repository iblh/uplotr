import type { Device, Position } from '@prisma/client';

type Coordinate = readonly [lat: number, lon: number];

interface DemoRouteSpec {
  id: string;
  externalId: string;
  name: string;
  type: string;
  source: string;
  group: string;
  tags: string[];
  waypoints: Coordinate[];
  startAt: string;
  intervalSeconds: number;
  pointsPerSegment: number;
  startBattery: number;
  batteryDrop: number;
  tempBase: number;
  rssiBase: number;
  snrBase: number;
}

const routeSpecs: DemoRouteSpec[] = [
  {
    id: 'demo-van',
    externalId: 'VAN-07',
    name: 'SF delivery van',
    type: 'generic',
    source: 'REST',
    group: 'West coast',
    tags: ['delivery', 'vehicle'],
    startAt: '2026-09-02T14:42:00Z',
    intervalSeconds: 34,
    pointsPerSegment: 6,
    startBattery: 96,
    batteryDrop: 14,
    tempBase: 21,
    rssiBase: -70,
    snrBase: 8.8,
    waypoints: [
      [37.8078, -122.4177],
      [37.8020, -122.4106],
      [37.7961, -122.3991],
      [37.7904, -122.3900],
      [37.7842, -122.3957],
      [37.7793, -122.3989],
      [37.7749, -122.4058],
      [37.7686, -122.4107],
      [37.7632, -122.4142],
      [37.7583, -122.4214],
      [37.7665, -122.4292],
      [37.7769, -122.4231],
      [37.7849, -122.4153],
      [37.7927, -122.4078],
    ],
  },
  {
    id: 'demo-bike',
    externalId: 'BIKE-12',
    name: 'NYC courier',
    type: 'generic',
    source: 'REST',
    group: 'East coast',
    tags: ['courier', 'e-bike'],
    startAt: '2026-09-02T15:05:00Z',
    intervalSeconds: 28,
    pointsPerSegment: 7,
    startBattery: 78,
    batteryDrop: 14,
    tempBase: 24,
    rssiBase: -76,
    snrBase: 7.2,
    waypoints: [
      [40.7029, -74.0125],
      [40.7075, -74.0110],
      [40.7128, -74.0060],
      [40.7181, -74.0013],
      [40.7227, -73.9972],
      [40.7276, -73.9944],
      [40.7330, -73.9904],
      [40.7389, -73.9891],
      [40.7440, -73.9857],
      [40.7502, -73.9880],
      [40.7548, -73.9840],
      [40.7580, -73.9773],
    ],
  },
  {
    id: 'demo-field',
    externalId: 'FIELD-03',
    name: 'Austin field tracker',
    type: 'lorawan',
    source: 'LoRaWAN',
    group: 'Field tests',
    tags: ['sensor', 'outdoor'],
    startAt: '2026-09-02T13:18:00Z',
    intervalSeconds: 58,
    pointsPerSegment: 6,
    startBattery: 91,
    batteryDrop: 5,
    tempBase: 29,
    rssiBase: -91,
    snrBase: 5.6,
    waypoints: [
      [30.2672, -97.7431],
      [30.2638, -97.7392],
      [30.2599, -97.7360],
      [30.2552, -97.7397],
      [30.2520, -97.7462],
      [30.2534, -97.7531],
      [30.2587, -97.7578],
      [30.2648, -97.7569],
      [30.2708, -97.7512],
      [30.2737, -97.7440],
      [30.2710, -97.7372],
      [30.2672, -97.7431],
    ],
  },
];

function interpolateRoute(spec: DemoRouteSpec): Position[] {
  const coordinates: Coordinate[] = [];

  spec.waypoints.slice(0, -1).forEach((start, segmentIndex) => {
    const end = spec.waypoints[segmentIndex + 1];
    for (let step = 0; step < spec.pointsPerSegment; step += 1) {
      const progress = step / spec.pointsPerSegment;
      const eased = progress * progress * (3 - 2 * progress);
      coordinates.push([
        start[0] + (end[0] - start[0]) * eased,
        start[1] + (end[1] - start[1]) * eased,
      ]);
    }
  });
  coordinates.push(spec.waypoints.at(-1)!);

  const startedAt = new Date(spec.startAt).getTime();
  return coordinates.map(([lat, lon], index) => {
    const progress = index / Math.max(coordinates.length - 1, 1);
    return {
      id: `${spec.id}-${index}`,
      deviceId: spec.id,
      ts: new Date(startedAt + index * spec.intervalSeconds * 1000),
      lat,
      lon,
      battery: Math.round(spec.startBattery - spec.batteryDrop * progress),
      temp: spec.tempBase + Math.sin(index / 7) * 2.4,
      light: Math.max(40, Math.round(620 + Math.sin(index / 9) * 410)),
      rssi: spec.rssiBase - (index % 8),
      snr: spec.snrBase - (index % 6) * 0.35,
      source: 'demo',
    };
  });
}

export const demoPositionsByDevice = Object.fromEntries(
  routeSpecs.map((spec) => [spec.id, interpolateRoute(spec)]),
) as Record<string, Position[]>;

export const demoDevices: Device[] = routeSpecs.map((spec) => {
  const positions = demoPositionsByDevice[spec.id];
  const latest = positions.at(-1)!;
  return {
    id: spec.id,
    externalId: spec.externalId,
    name: spec.name,
    type: spec.type,
    source: spec.source,
    group: spec.group,
    tags: spec.tags,
    lastSeen: latest.ts,
    lastLat: latest.lat,
    lastLon: latest.lon,
    lastBattery: latest.battery,
    lastRssi: latest.rssi,
    lastSnr: latest.snr,
    mapperId: null,
  };
});

function distanceBetween(a: Position, b: Position): number {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(b.lat - a.lat);
  const lonDelta = toRadians(b.lon - a.lon);
  const latA = toRadians(a.lat);
  const latB = toRadians(b.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2
    + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function getRouteStats(positions: Position[]) {
  const distanceKm = positions.slice(1).reduce(
    (total, point, index) => total + distanceBetween(positions[index], point),
    0,
  );
  const durationMinutes = positions.length > 1
    ? (positions.at(-1)!.ts.getTime() - positions[0].ts.getTime()) / 60000
    : 0;
  const batteryUsed = positions.length > 1
    ? Math.max(0, (positions[0].battery ?? 0) - (positions.at(-1)!.battery ?? 0))
    : 0;

  return {
    distanceKm,
    durationMinutes,
    averageSpeedKph: durationMinutes > 0 ? distanceKm / (durationMinutes / 60) : 0,
    batteryUsed,
  };
}
