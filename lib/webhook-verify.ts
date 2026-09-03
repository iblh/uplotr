import { NextRequest } from 'next/server';
import { getAuthMode } from '@/lib/auth-mode';
import { timingSafeEqual } from 'node:crypto';
import { findApiKey } from '@/lib/api-key';

/**
 * Validates webhook auth token based on the global AUTH_MODE.
 *
 * Supports:
 * 1. Authorization: Bearer <token>
 * 2. x-uplotr-key / x-heyiot-token headers
 *
 * Token sources:
 * 1. Env secret: UPLOTR_API_SECRET (fallback: WEBHOOK_SECRET)
 * 2. API keys table (api_keys)
 */
export async function verifyWebhookSecret(req: NextRequest): Promise<boolean> {
  const mode = await getAuthMode();

  if (mode === 'OFF') {
    return true;
  }

  const token = extractApiToken(req);
  if (!token) {
    return mode === 'OPTIONAL';
  }

  const secret = process.env.UPLOTR_API_SECRET || process.env.WEBHOOK_SECRET;

  if (secret && safeEqual(token, secret)) return true;

  const keyRecord = await findApiKey(token);

  return Boolean(keyRecord);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function extractApiToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return bearerToken;
  }

  return req.headers.get('x-uplotr-key') || req.headers.get('x-heyiot-token');
}
