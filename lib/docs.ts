import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const docs = [
  { slug: 'quick-start', file: 'QUICK_START.md', title: 'Quick start', description: 'Run uplotr locally and ingest your first location.' },
  { slug: 'deployment', file: 'DEPLOYMENT.md', title: 'Deployment', description: 'Docker Compose and Vercel deployment guidance.' },
  { slug: 'api-reference', file: 'API_REFERENCE.md', title: 'API reference', description: 'Authentication, ingest payloads, responses, and limits.' },
  { slug: 'device-setup', file: 'DEVICE_SETUP.md', title: 'LoRaWAN setup', description: 'Connect TTN, Helium, and ChirpStack webhooks.' },
  { slug: 'integrations', file: 'INTEGRATIONS.md', title: 'Integrations', description: 'Examples for iOS, ESP32, Meshtastic, and Linux.' },
  { slug: 'backup-restore', file: 'BACKUP_RESTORE.md', title: 'Backup and restore', description: 'Protect and recover your PostgreSQL data.' },
  { slug: 'upgrading', file: 'UPGRADING.md', title: 'Upgrading', description: 'Apply migrations and roll out new releases safely.' },
] as const;

export const getDoc = cache(async (slug: string) => {
  const normalized = slug.replace(/\.md$/i, '').toLowerCase();
  const entry = docs.find((doc) => doc.slug === normalized || doc.file.replace(/\.md$/i, '').toLowerCase() === normalized);
  if (!entry) return null;
  const content = await readFile(path.join(process.cwd(), 'docs', entry.file), 'utf8');
  return { ...entry, content };
});
