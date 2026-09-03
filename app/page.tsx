import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Box, Code2, Github, Map, PlayCircle, Radio, Route, ShieldCheck } from 'lucide-react';
import packageJson from '@/package.json';

const features = [
  { icon: Radio, title: 'REST and LoRaWAN ingest', body: 'Connect generic trackers, TTN, Helium, or ChirpStack with a consistent location schema.' },
  { icon: Map, title: 'Fast map console', body: 'Inspect live device health, latest position, battery, signal, groups, and tags.' },
  { icon: Route, title: 'Trajectory replay', body: 'Filter a time window, render paths or point clouds, and replay movement history.' },
  { icon: Code2, title: 'Payload mapping', body: 'Map unfamiliar JSON payloads without rebuilding your integration pipeline.' },
  { icon: Box, title: 'Self-hosted by default', body: 'Run the same application with Docker Compose and PostgreSQL on infrastructure you control.' },
  { icon: ShieldCheck, title: 'Private data plane', body: 'API-key protected ingest, owner-controlled retention, and no product analytics by default.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07090d] text-zinc-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="uplotr home">
            <Image src="/logo.svg" alt="" width={28} height={28} className="invert" />
            uplotr
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-sky-300">Beta</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-400" aria-label="Primary navigation">
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <Link href="/demo" className="hover:text-white">Demo</Link>
            <a href="https://github.com/iblh/uplotr" className="hidden hover:text-white sm:inline">GitHub</a>
            <Link href="/app" className="rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-zinc-200">Open console</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.16),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-32">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-sky-300">Open-source tracking console</p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
              Get device locations onto a map in minutes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              uplotr turns REST and LoRaWAN payloads into a focused map, replay, and device-health workflow—without the weight of an enterprise IoT platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-md bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300">
                <PlayCircle className="h-4 w-4" /> Try the read-only demo
              </Link>
              <Link href="/docs/quick-start" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-semibold hover:bg-white/5">
                Deploy your own <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 text-xs text-zinc-500">Apache-2.0 · v{packageJson.version} · No hosted sign-up required</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-sky-950/30">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> tracker-van-07 · online
            </div>
            <div className="relative h-[330px] overflow-hidden rounded-b-xl bg-[radial-gradient(circle_at_45%_46%,rgba(56,189,248,0.2),transparent_7%),linear-gradient(135deg,#111827,#090b10)]">
              <div className="absolute left-[12%] top-[68%] h-1 w-[72%] -rotate-12 rounded-full bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,.7)]" />
              <div className="absolute left-[58%] top-[43%] h-4 w-4 rounded-full border-4 border-white bg-sky-500 shadow-lg" />
              <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/60 p-3 text-xs text-zinc-300 backdrop-blur">
                <div className="font-semibold text-white">24h trajectory</div>
                <div className="mt-1 text-zinc-500">184 positions · battery 82%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-300">A deliberately smaller platform</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Everything needed for time-to-map.</h2>
          <p className="mt-4 text-zinc-400">Certificates, OTA, device shadows, multi-tenancy, alerts, and native MQTT/Kafka adapters remain outside the Public Beta.</p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-[#090b10] p-6">
              <Icon className="h-5 w-5 text-sky-300" />
              <h3 className="mt-5 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Five-minute Docker start</p>
          <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black p-5 text-sm text-sky-200"><code>{`git clone https://github.com/iblh/uplotr.git
cd uplotr
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml up -d`}</code></pre>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-5 py-10 text-sm text-zinc-500 sm:flex-row">
        <span>uplotr · Open-source tracking console</span>
        <div className="flex gap-5"><Link href="/docs">Docs</Link><Link href="/status">Status</Link><a href="https://github.com/iblh/uplotr"><Github className="h-4 w-4" aria-label="GitHub" /></a></div>
      </footer>
    </main>
  );
}
