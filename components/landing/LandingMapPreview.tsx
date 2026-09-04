"use client";

import dynamic from 'next/dynamic';
import { MapPin, Radio, Route } from 'lucide-react';
import { getRouteStats, landingPreviewPositions } from '@/lib/demo-data';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((module) => module.MapContainer),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-slate-900" /> },
);

const positions = landingPreviewPositions;
const latest = positions.at(-1)!;
const stats = getRouteStats(positions);

export function LandingMapPreview() {
  return (
    <div className="relative h-[390px] overflow-hidden rounded-xl bg-slate-950 sm:h-[430px]">
      <MapContainer
        positions={positions}
        currentPosition={latest}
        displayMode="both"
        providerOverride="OPENFREEMAP"
        fitPositions={positions}
        interactive={false}
        showControls={false}
        routeColor="#38bdf8"
        pointStride={4}
        className="h-full border-0"
      />

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        VAN-07 · live
      </div>

      <div className="pointer-events-none absolute bottom-8 left-3 right-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-xl backdrop-blur-md">
        <div className="bg-slate-950/85 p-3">
          <Route className="h-4 w-4 text-sky-300" />
          <div className="mt-2 text-lg font-semibold text-white">{stats.distanceKm.toFixed(1)} km</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">route</div>
        </div>
        <div className="bg-slate-950/85 p-3">
          <Radio className="h-4 w-4 text-emerald-300" />
          <div className="mt-2 text-lg font-semibold text-white">{positions.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">positions</div>
        </div>
        <div className="bg-slate-950/85 p-3">
          <MapPin className="h-4 w-4 text-amber-300" />
          <div className="mt-2 text-lg font-semibold text-white">82%</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">battery</div>
        </div>
      </div>
    </div>
  );
}
