import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function apiKeyPrefix(value: string): string {
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

export function generateApiKey(): string {
  return `upl_${randomBytes(32).toString('base64url')}`;
}

export async function findApiKey(value: string): Promise<{ id: string } | null> {
  const keyHash = hashApiKey(value);
  const hashedRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true },
  });

  if (hashedRecord) {
    await prisma.apiKey.update({ where: { id: hashedRecord.id }, data: { lastUsedAt: new Date() } });
    return hashedRecord;
  }

  const legacyRecord = await prisma.apiKey.findUnique({
    where: { key: value },
    select: { id: true },
  });

  if (!legacyRecord) return null;

  await prisma.apiKey.update({
    where: { id: legacyRecord.id },
    data: { keyHash, prefix: apiKeyPrefix(value), lastUsedAt: new Date() },
  });
  return legacyRecord;
}
