import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { docs } from '@/lib/docs';

export const metadata: Metadata = { title: 'Documentation', description: 'Install, configure, and integrate uplotr.' };

export default function DocsIndexPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Home</Link>
        <p className="mt-14 font-mono text-xs uppercase tracking-[0.2em] text-primary">Documentation</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Build your tracking console.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Start with Docker, connect a device, then refine payload mapping, retention, and production operations.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {docs.map((doc) => (
            <Link key={doc.slug} href={`/docs/${doc.slug}`} className="group rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:bg-muted/30">
              <div className="flex items-center justify-between"><h2 className="font-semibold">{doc.title}</h2><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" /></div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{doc.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
