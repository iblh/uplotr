import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusCard } from '@/components/StatusCard';

export const metadata: Metadata = { title: 'Status', description: 'uplotr service status and health check.' };

export default function StatusPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><section className="w-full max-w-lg rounded-xl border bg-card p-7"><h1 className="text-2xl font-semibold">Service status</h1><p className="mt-4 text-muted-foreground">This check reports whether the application can reach its configured PostgreSQL database. Machine-readable status is available at <a href="/api/health" className="text-primary underline">/api/health</a>.</p><StatusCard /><Link href="/" className="mt-6 inline-block text-sm text-primary">Return home</Link></section></main>;
}
