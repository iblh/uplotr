export const MAP_PROVIDER_VALUES = ['MAPBOX', 'OPENFREEMAP'] as const;
export type MapProvider = (typeof MAP_PROVIDER_VALUES)[number];

export function normalizeMapProvider(value: string | null | undefined): MapProvider | null {
  const upper = value?.toUpperCase();
  if (!upper) return null;
  return MAP_PROVIDER_VALUES.includes(upper as MapProvider) ? (upper as MapProvider) : null;
}

export function parseMapProvider(value: unknown): MapProvider | null {
  if (typeof value !== 'string') return null;
  return normalizeMapProvider(value);
}

export function getDefaultMapProvider(): MapProvider {
  const fromEnv = normalizeMapProvider(process.env.MAP_PROVIDER);
  if (fromEnv) return fromEnv;
  return 'OPENFREEMAP';
}
