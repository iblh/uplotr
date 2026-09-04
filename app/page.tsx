import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDashed,
  Code2,
  Database,
  ExternalLink,
  Github,
  Map,
  PlayCircle,
  Radio,
  Route,
  Server,
  ShieldCheck,
} from 'lucide-react';
import packageJson from '@/package.json';
import { LandingMapPreview } from '@/components/landing/LandingMapPreview';

const features = [
  { icon: Radio, title: 'REST and LoRaWAN ingest', body: 'Connect generic trackers, TTN, Helium, or ChirpStack with a consistent location schema.' },
  { icon: Map, title: 'Fast map console', body: 'Inspect live device health, latest position, battery, signal, groups, and tags.' },
  { icon: Route, title: 'Trajectory replay', body: 'Filter a time window, render paths or point clouds, and replay movement history.' },
  { icon: Code2, title: 'Payload mapping', body: 'Map unfamiliar JSON payloads without rebuilding your integration pipeline.' },
  { icon: Box, title: 'Self-hosted by default', body: 'Run the same application with Docker Compose and PostgreSQL on infrastructure you control.' },
  { icon: ShieldCheck, title: 'Private data plane', body: 'API-key protected ingest, owner-controlled retention, and no product analytics by default.' },
];

const workflow = [
  { step: '01', icon: Radio, title: 'Send a position', body: 'POST a normalized location or forward a LoRaWAN webhook from your existing network server.' },
  { step: '02', icon: Database, title: 'Normalize and retain', body: 'Map payload fields once, store them in PostgreSQL, and set a retention window you control.' },
  { step: '03', icon: Map, title: 'Explore the route', body: 'Open the console to inspect live state, compare telemetry, filter history, and replay movement.' },
];

const availableNow = ['REST ingest API', 'TTN, Helium, and ChirpStack webhooks', 'Map and point-cloud views', 'Trajectory replay', 'Docker Compose self-hosting'];
const roadmap = ['Offline and low-battery alerts', 'Native MQTT adapter', 'Geofences and data export', 'Multi-tenant hosted SaaS'];

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
            <Link href="/docs" className="transition-colors hover:text-white">Docs</Link>
            <Link href="/demo" className="transition-colors hover:text-white">Demo</Link>
            <a href="https://github.com/iblh/uplotr" target="_blank" rel="noreferrer" className="hidden items-center gap-1 transition-colors hover:text-white sm:inline-flex">
              GitHub <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <Link href="/app" className="rounded-md bg-white px-3 py-2 font-medium text-black transition-colors hover:bg-zinc-200">Open console</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.16),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-sky-300">Open-source tracking console</p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
              Get device locations onto a map in minutes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              uplotr turns REST and LoRaWAN payloads into a focused map, replay, and device-health workflow—without the weight of an enterprise IoT platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-md bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-sky-300">
                <PlayCircle className="h-4 w-4" /> Try the read-only demo
              </Link>
              <Link href="/docs/quick-start" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-semibold transition-colors hover:bg-white/5">
                Deploy your own <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 text-xs text-zinc-500">Apache-2.0 · v{packageJson.version} · No hosted sign-up required</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-sky-950/30">
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3 pt-1 text-xs text-zinc-500">
              <span>Live route preview</span>
              <span>MapLibre · OpenFreeMap</span>
            </div>
            <div className="pt-3"><LandingMapPreview /></div>
          </div>
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 px-5 py-5 text-xs text-zinc-500">
          <span className="font-mono uppercase tracking-[0.18em] text-zinc-600">Works with</span>
          {['Generic REST', 'The Things Stack', 'Helium', 'ChirpStack', 'PostgreSQL'].map((name) => (
            <span key={name} className="text-zinc-400">{name}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-300">From payload to playback</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">A short path from device to answer.</h2>
          <p className="mt-4 leading-7 text-zinc-400">Keep your current trackers and network server. uplotr handles the focused layer between location payloads and an understandable route.</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {workflow.map(({ step, icon: Icon, title, body }) => (
            <article key={step} className="relative rounded-xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-sky-300" />
                <span className="font-mono text-xs text-zinc-600">{step}</span>
              </div>
              <h3 className="mt-7 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-300">A deliberately smaller platform</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Everything needed for time-to-map.</h2>
            <p className="mt-4 text-zinc-400">Focused primitives for teams that need useful location visibility, not another all-purpose IoT suite.</p>
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
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-20 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,.1),rgba(255,255,255,.02))] p-8 sm:p-10">
          <Server className="h-6 w-6 text-sky-300" />
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">Your deployment. Your database. Your location history.</h2>
          <p className="mt-4 max-w-xl leading-7 text-zinc-400">Run uplotr on your own infrastructure, choose how long data stays, and keep analytics disabled by default. The public demo is synthetic and cannot write to the official instance.</p>
          <Link href="/docs/docker" className="mt-7 inline-flex items-center gap-2 font-medium text-sky-300 hover:text-sky-200">
            Read the self-hosting guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Available in Public Beta</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              {availableNow.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300"><CircleDashed className="h-4 w-4" />On the roadmap</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              {roadmap.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Five-minute Docker start</p>
            <h2 className="mt-3 text-2xl font-semibold">Go from clone to healthy service.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">The production Compose file starts PostgreSQL, runs migrations, and exposes a health endpoint for your deployment checks.</p>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black p-5 text-sm leading-6 text-sky-200"><code>{`git clone https://github.com/iblh/uplotr.git
cd uplotr
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml up -d`}</code></pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See the complete workflow before you deploy.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-400">Explore a richer synthetic fleet, then use the documentation to connect your first real device.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/demo" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"><PlayCircle className="h-4 w-4" />Open demo</Link>
          <a href="https://github.com/iblh/uplotr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-semibold hover:bg-white/5"><Github className="h-4 w-4" />View source <ExternalLink className="h-3 w-3" /></a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col justify-between gap-4 border-t border-white/10 px-5 py-10 text-sm text-zinc-500 sm:flex-row">
        <span>uplotr · Open-source tracking console</span>
        <div className="flex gap-5">
          <Link href="/docs" className="hover:text-zinc-300">Docs</Link>
          <Link href="/status" className="hover:text-zinc-300">Status</Link>
          <a href="https://github.com/iblh/uplotr" target="_blank" rel="noreferrer" className="hover:text-zinc-300" aria-label="uplotr on GitHub (opens in a new tab)"><Github className="h-4 w-4" /></a>
        </div>
      </footer>
    </main>
  );
}
