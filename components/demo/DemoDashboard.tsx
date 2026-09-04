"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Battery,
  Clock3,
  Gauge,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { InfoPanel } from '@/components/InfoPanel';
import { cn } from '@/lib/utils';
import { demoDevices, demoPositionsByDevice, getRouteStats } from '@/lib/demo-data';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((module) => module.MapContainer),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> },
);

const routeColors: Record<string, string> = {
  'demo-van': '#38bdf8',
  'demo-bike': '#a78bfa',
  'demo-field': '#34d399',
};

type PlaybackSpeed = 1 | 2 | 4;

export function DemoDashboard() {
  const [deviceId, setDeviceId] = React.useState(demoDevices[0].id);
  const [displayMode, setDisplayMode] = React.useState<'path' | 'points' | 'both'>('both');
  const [cursor, setCursor] = React.useState(demoPositionsByDevice[demoDevices[0].id].length - 1);
  const [playing, setPlaying] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState<PlaybackSpeed>(2);

  const device = demoDevices.find((entry) => entry.id === deviceId) ?? demoDevices[0];
  const positions = demoPositionsByDevice[deviceId];
  const visiblePositions = positions.slice(0, cursor + 1);
  const currentPosition = positions[cursor] ?? positions.at(-1) ?? null;
  const stats = React.useMemo(() => getRouteStats(positions), [positions]);
  const routeColor = routeColors[deviceId] ?? '#38bdf8';

  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= positions.length - 1) {
          setPlaying(false);
          return positions.length - 1;
        }
        return current + 1;
      });
    }, 320 / playbackSpeed);
    return () => window.clearInterval(timer);
  }, [playing, playbackSpeed, positions.length]);

  const selectDevice = (nextId: string) => {
    setDeviceId(nextId);
    setCursor(demoPositionsByDevice[nextId].length - 1);
    setPlaying(false);
  };

  const togglePlayback = () => {
    if (cursor >= positions.length - 1) setCursor(0);
    setPlaying((value) => !value);
  };

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-background md:flex-row">
      <aside className="z-20 max-h-[46svh] w-full shrink-0 overflow-y-auto border-b bg-background/95 p-3 md:max-h-none md:w-[340px] md:border-b-0 md:border-r md:p-4">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Home</Link></Button>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3 w-3" />Synthetic · read only</span>
        </div>

        <div className="px-2">
          <h1 className="text-xl font-semibold tracking-tight">Interactive fleet demo</h1>
          <p className="pb-4 pt-1 text-xs leading-5 text-muted-foreground">Switch devices, inspect telemetry, and replay generated routes. Nothing is written to a database.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-1 md:overflow-visible">
          {demoDevices.map((entry) => {
            const selected = entry.id === deviceId;
            const color = routeColors[entry.id];
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectDevice(entry.id)}
                aria-pressed={selected}
                className={cn(
                  'min-w-[220px] rounded-xl border p-3 text-left transition md:min-w-0',
                  selected ? 'border-primary/50 bg-primary/[0.07] shadow-sm' : 'hover:bg-muted/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      {entry.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{entry.externalId} · {entry.source}</div>
                  </div>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{entry.lastBattery}%</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {entry.tags.map((tag) => <span key={tag} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 px-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Route summary</h2>
            <span className="text-[10px] text-muted-foreground">{positions.length} samples</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-card p-3">
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Route className="h-3 w-3" />Distance</dt>
              <dd className="mt-1 text-lg font-semibold">{stats.distanceKm.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km</span></dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Clock3 className="h-3 w-3" />Duration</dt>
              <dd className="mt-1 text-lg font-semibold">{Math.round(stats.durationMinutes)} <span className="text-xs font-normal text-muted-foreground">min</span></dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Gauge className="h-3 w-3" />Avg speed</dt>
              <dd className="mt-1 text-lg font-semibold">{stats.averageSpeedKph.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km/h</span></dd>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Battery className="h-3 w-3" />Battery used</dt>
              <dd className="mt-1 text-lg font-semibold">{stats.batteryUsed} <span className="text-xs font-normal text-muted-foreground">pts</span></dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 hidden rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground md:block">
          Settings, payload logs, API keys, and all write actions are intentionally unavailable in demo mode.
        </div>
      </aside>

      <section className="relative min-h-0 flex-1">
        <MapContainer
          positions={visiblePositions}
          fitPositions={positions}
          currentPosition={currentPosition}
          displayMode={displayMode}
          providerOverride="OPENFREEMAP"
          routeColor={routeColor}
        />

        <div className="absolute left-3 top-3 z-10 flex rounded-lg border bg-background/90 p-1 shadow-lg backdrop-blur">
          {(['path', 'points', 'both'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setDisplayMode(mode)}
              aria-pressed={displayMode === mode}
              className={cn('rounded-md px-3 py-1.5 text-xs capitalize transition-colors', displayMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="absolute right-3 top-16 z-10 hidden items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-xs shadow-lg backdrop-blur sm:flex">
          <Radio className="h-3.5 w-3.5" style={{ color: routeColor }} />
          <span className="font-medium">{device.name}</span>
          <span className="text-muted-foreground">{device.group}</span>
        </div>

        <div className="absolute bottom-8 left-3 right-3 z-10 rounded-xl border bg-background/90 p-3 shadow-xl backdrop-blur md:left-1/2 md:max-w-2xl md:-translate-x-1/2">
          <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{format(positions[0].ts, 'HH:mm:ss')}</span>
            <span className="font-medium text-foreground">{currentPosition ? format(currentPosition.ts, 'MMM d · HH:mm:ss') : '—'}</span>
            <span>{format(positions.at(-1)!.ts, 'HH:mm:ss')}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button type="button" size="icon" variant="ghost" onClick={togglePlayback} aria-label={playing ? 'Pause replay' : 'Play replay'}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => { setCursor(0); setPlaying(false); }} aria-label="Restart replay">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Slider value={[cursor]} min={0} max={positions.length - 1} step={1} onValueChange={([value]) => { setCursor(value); setPlaying(false); }} variant="playback" aria-label="Replay position" />
            <div className="hidden rounded-md bg-muted p-0.5 sm:flex" aria-label="Playback speed">
              {([1, 2, 4] as PlaybackSpeed[]).map((speed) => (
                <button key={speed} type="button" onClick={() => setPlaybackSpeed(speed)} aria-pressed={playbackSpeed === speed} className={cn('rounded px-2 py-1 text-[10px] font-medium', playbackSpeed === speed ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{speed}×</button>
              ))}
            </div>
            <span className="min-w-12 text-right font-mono text-xs">{cursor + 1}/{positions.length}</span>
          </div>
        </div>

        <div className="absolute bottom-32 right-4 z-10"><InfoPanel position={currentPosition} /></div>
      </section>
    </main>
  );
}
