import { prisma } from '@/lib/prisma';

export const AUTH_MODE_VALUES = ['OFF', 'OPTIONAL', 'REQUIRED'] as const;
export type AuthMode = (typeof AUTH_MODE_VALUES)[number];

const AUTH_MODE_SETTING_KEY = 'auth.mode';
const AUTH_MODE_CACHE_TTL_MS = 5000;

let authModeCache: { value: AuthMode; expiresAt: number } | null = null;

function normalizeAuthMode(value: string | null | undefined): AuthMode | null {
  const upper = value?.toUpperCase();
  if (!upper) return null;
  return AUTH_MODE_VALUES.includes(upper as AuthMode) ? (upper as AuthMode) : null;
}

export function getDefaultAuthMode(): AuthMode {
  const fromEnv = normalizeAuthMode(process.env.AUTH_MODE);
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'REQUIRED' : 'OFF';
}

export async function getAuthMode(options?: { forceRefresh?: boolean }): Promise<AuthMode> {
  const now = Date.now();
  if (!options?.forceRefresh && authModeCache && authModeCache.expiresAt > now) {
    return authModeCache.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: AUTH_MODE_SETTING_KEY },
      select: { value: true },
    });

    const mode = normalizeAuthMode(setting?.value) ?? getDefaultAuthMode();
    authModeCache = { value: mode, expiresAt: now + AUTH_MODE_CACHE_TTL_MS };
    return mode;
  } catch (error) {
    const fallback = getDefaultAuthMode();
    authModeCache = { value: fallback, expiresAt: now + AUTH_MODE_CACHE_TTL_MS };
    console.error('[AuthMode] Failed to read mode, using fallback:', error);
    return fallback;
  }
}

export async function setAuthMode(mode: AuthMode): Promise<AuthMode> {
  await prisma.systemSetting.upsert({
    where: { key: AUTH_MODE_SETTING_KEY },
    update: { value: mode },
    create: { key: AUTH_MODE_SETTING_KEY, value: mode },
  });

  authModeCache = { value: mode, expiresAt: Date.now() + AUTH_MODE_CACHE_TTL_MS };
  return mode;
}

export function parseAuthMode(value: unknown): AuthMode | null {
  if (typeof value !== 'string') return null;
  return normalizeAuthMode(value);
}
