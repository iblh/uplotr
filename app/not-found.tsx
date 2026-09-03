import Link from 'next/link';

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center"><div><p className="font-mono text-sm text-primary">404</p><h1 className="mt-3 text-3xl font-semibold">Page not found</h1><p className="mt-3 text-muted-foreground">The route may have moved or never existed.</p><Link href="/" className="mt-6 inline-block text-primary underline">Return home</Link></div></main>;
}
