"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Device, Position } from '@prisma/client';
import { ArrowLeft, Pause, Play, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { InfoPanel } from '@/components/InfoPanel';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((module) => module.MapContainer),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> },
);

const devices: Device[] = [
  { id: 'demo-van', externalId: 'VAN-07', name: 'SF delivery van', type: 'generic', source: 'demo', group: 'West coast', tags: ['delivery'], lastSeen: new Date('2026-09-02T16:30:00Z'), lastLat: 37.7924, lastLon: -122.3971, lastBattery: 82, lastRssi: -71, lastSnr: 8.4, mapperId: null },
  { id: 'demo-bike', externalId: 'BIKE-12', name: 'NYC courier', type: 'generic', source: 'demo', group: 'East coast', tags: ['courier'], lastSeen: new Date('2026-09-02T16:27:00Z'), lastLat: 40.7258, lastLon: -73.9952, lastBattery: 64, lastRssi: -78, lastSnr: 6.7, mapperId: null },
];

function makePositions(deviceId: string, start: [number, number], delta: [number, number]): Position[] {
  return Array.from({ length: 42 }, (_, index) => ({
    id: `${deviceId}-${index}`,
    deviceId,
    ts: new Date(Date.UTC(2026, 8, 2, 15, index * 2)),
    lat: start[0] + delta[0] * index + Math.sin(index / 3) * 0.00035,
    lon: start[1] + delta[1] * index + Math.cos(index / 4) * 0.00035,
    battery: Math.round(95 - index * 0.3),
    temp: 20 + Math.sin(index / 5) * 3,
    light: null,
    rssi: -68 - (index % 9),
    snr: 9 - (index % 5) * 0.4,
    source: 'demo',
  }));
}

const positionsByDevice: Record<string, Position[]> = {
  'demo-van': makePositions('demo-van', [37.768, -122.431], [0.00058, 0.00082]),
  'demo-bike': makePositions('demo-bike', [40.711, -74.012], [0.00036, 0.00042]),
};

export function DemoDashboard() {
  const [deviceId, setDeviceId] = React.useState(devices[0].id);
  const [displayMode, setDisplayMode] = React.useState<'path' | 'points' | 'both'>('both');
  const [cursor, setCursor] = React.useState(41);
  const [playing, setPlaying] = React.useState(false);
  const positions = positionsByDevice[deviceId];
  const currentPosition = positions[cursor] || positions.at(-1) || null;

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
    }, 180);
    return () => window.clearInterval(timer);
  }, [playing, positions.length]);

  const selectDevice = (nextId: string) => {
    setDeviceId(nextId);
    setCursor(positionsByDevice[nextId].length - 1);
    setPlaying(false);
  };

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-background md:flex-row">
      <aside className="z-20 w-full border-b bg-background/95 p-3 md:w-72 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Home</Link></Button>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-500"><ShieldCheck className="h-3 w-3" />Synthetic · read only</span>
        </div>
        <h1 className="px-2 text-lg font-semibold">Interactive demo</h1>
        <p className="px-2 pb-4 pt-1 text-xs text-muted-foreground">Map, filter, and replay generated location data. Nothing is saved.</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {devices.map((device) => (
            <button key={device.id} type="button" onClick={() => selectDevice(device.id)} className={cn('rounded-lg border p-3 text-left transition', device.id === deviceId ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
              <div className="text-sm font-semibold">{device.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{device.group} · {device.lastBattery}%</div>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-lg border p-3 text-xs text-muted-foreground">
          Settings, payload logs, API keys, and all mutations are intentionally unavailable in demo mode.
        </div>
      </aside>

      <section className="relative min-h-0 flex-1">
        <MapContainer positions={positions} currentPosition={currentPosition} displayMode={displayMode} providerOverride="OPENFREEMAP" />
        <div className="absolute left-3 top-3 z-10 flex rounded-md border bg-background/85 p-1 shadow backdrop-blur">
          {(['path', 'points', 'both'] as const).map((mode) => <button type="button" key={mode} onClick={() => setDisplayMode(mode)} className={cn('rounded px-3 py-1 text-xs capitalize', displayMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{mode}</button>)}
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 rounded-lg border bg-background/85 p-3 shadow-xl backdrop-blur md:left-1/2 md:max-w-xl md:-translate-x-1/2">
          <Button type="button" size="icon" variant="ghost" onClick={() => { if (cursor >= positions.length - 1) setCursor(0); setPlaying((value) => !value); }} aria-label={playing ? 'Pause replay' : 'Play replay'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Slider value={[cursor]} min={0} max={positions.length - 1} step={1} onValueChange={([value]) => { setCursor(value); setPlaying(false); }} variant="playback" />
          <span className="min-w-12 text-right font-mono text-xs">{cursor + 1}/{positions.length}</span>
        </div>
        <div className="absolute bottom-20 right-4 z-10"><InfoPanel position={currentPosition} /></div>
      </section>
    </main>
  );
}
