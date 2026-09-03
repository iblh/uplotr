import { prisma } from '@/lib/prisma';
import {
  getDefaultMapProvider,
  MapProvider,
  normalizeMapProvider,
} from '@/lib/map-provider-config';

export const MAP_PROVIDER_SETTING_KEY = 'map.provider';
export const MAPBOX_TOKEN_SETTING_KEY = 'mapbox.token';
const MAP_PROVIDER_CACHE_TTL_MS = 5000;

let mapProviderCache: { value: MapProvider; expiresAt: number } | null = null;
let mapboxTokenCache: { value: string | null; expiresAt: number } | null = null;

function normalizeMapboxToken(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getDefaultMapboxToken(): string | null {
  return normalizeMapboxToken(process.env.MAPBOX_TOKEN);
}

export async function getMapProvider(options?: { forceRefresh?: boolean }): Promise<MapProvider> {
  const now = Date.now();
  if (!options?.forceRefresh && mapProviderCache && mapProviderCache.expiresAt > now) {
    return mapProviderCache.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: MAP_PROVIDER_SETTING_KEY },
      select: { value: true },
    });

    const provider = normalizeMapProvider(setting?.value) ?? getDefaultMapProvider();
    mapProviderCache = { value: provider, expiresAt: now + MAP_PROVIDER_CACHE_TTL_MS };
    return provider;
  } catch (error) {
    const fallback = getDefaultMapProvider();
    mapProviderCache = { value: fallback, expiresAt: now + MAP_PROVIDER_CACHE_TTL_MS };
    console.error('[MapProvider] Failed to read provider, using fallback:', error);
    return fallback;
  }
}

export async function setMapProvider(provider: MapProvider): Promise<MapProvider> {
  await prisma.systemSetting.upsert({
    where: { key: MAP_PROVIDER_SETTING_KEY },
    update: { value: provider },
    create: { key: MAP_PROVIDER_SETTING_KEY, value: provider },
  });

  mapProviderCache = { value: provider, expiresAt: Date.now() + MAP_PROVIDER_CACHE_TTL_MS };
  return provider;
}

export async function getMapboxToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  const now = Date.now();
  if (!options?.forceRefresh && mapboxTokenCache && mapboxTokenCache.expiresAt > now) {
    return mapboxTokenCache.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: MAPBOX_TOKEN_SETTING_KEY },
      select: { value: true },
    });

    const token = normalizeMapboxToken(setting?.value) ?? getDefaultMapboxToken();
    mapboxTokenCache = { value: token, expiresAt: now + MAP_PROVIDER_CACHE_TTL_MS };
    return token;
  } catch (error) {
    const fallback = getDefaultMapboxToken();
    mapboxTokenCache = { value: fallback, expiresAt: now + MAP_PROVIDER_CACHE_TTL_MS };
    console.error('[MapProvider] Failed to read Mapbox token, using fallback:', error);
    return fallback;
  }
}

export async function setMapboxToken(token: string | null): Promise<string | null> {
  const normalized = normalizeMapboxToken(token);

  if (!normalized) {
    await prisma.systemSetting.deleteMany({
      where: { key: MAPBOX_TOKEN_SETTING_KEY },
    });

    const fallback = getDefaultMapboxToken();
    mapboxTokenCache = { value: fallback, expiresAt: Date.now() + MAP_PROVIDER_CACHE_TTL_MS };
    return fallback;
  }

  await prisma.systemSetting.upsert({
    where: { key: MAPBOX_TOKEN_SETTING_KEY },
    update: { value: normalized },
    create: { key: MAPBOX_TOKEN_SETTING_KEY, value: normalized },
  });

  mapboxTokenCache = { value: normalized, expiresAt: Date.now() + MAP_PROVIDER_CACHE_TTL_MS };
  return normalized;
}
