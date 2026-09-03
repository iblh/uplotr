"use client";

import * as React from 'react';
import useSWR from 'swr';
import MapboxMap, {
  Source,
  Layer,
  Marker,
  NavigationControl,
  FullscreenControl,
} from 'react-map-gl';
import MapLibreMap, {
  Source as MapLibreSource,
  Layer as MapLibreLayer,
  Marker as MapLibreMarker,
  NavigationControl as MapLibreNavigationControl,
  FullscreenControl as MapLibreFullscreenControl,
} from 'react-map-gl/maplibre';
import { Position } from '@prisma/client';
import { MapPin } from 'lucide-react';
import { useTheme } from "next-themes";

type MapProvider = 'MAPBOX' | 'OPENFREEMAP';

interface MapProviderResponse {
  provider: MapProvider;
  mapboxToken: string | null;
}

type MapDisplayMode = 'path' | 'points' | 'both';

interface MapContainerProps {
  positions: Position[];
  currentPosition: Position | null; // The position at the playback cursor
  displayMode: MapDisplayMode;
  providerOverride?: MapProvider;
  mapboxTokenOverride?: string | null;
}

export function MapContainer({
  positions,
  currentPosition,
  displayMode,
  providerOverride,
  mapboxTokenOverride,
}: MapContainerProps) {
  const mapRef = React.useRef<any>(null);
  const handleMapLoad = React.useCallback(() => {
    const map = mapRef.current?.getMap?.();
    map?.resize();
  }, []);
  const { theme } = useTheme();

  const { data: mapProviderData, error: mapConfigError } = useSWR<MapProviderResponse>(
    providerOverride ? null : '/api/settings/map-provider',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load map provider');
      return res.json();
    },
  );
  const mapProvider = providerOverride ?? mapProviderData?.provider ?? 'OPENFREEMAP';
  const mapboxToken = mapboxTokenOverride ?? mapProviderData?.mapboxToken ?? null;
  const isMapbox = mapProvider === 'MAPBOX';
  const MapComponent = (isMapbox ? MapboxMap : MapLibreMap) as any;
  const SourceComponent = (isMapbox ? Source : MapLibreSource) as any;
  const LayerComponent = (isMapbox ? Layer : MapLibreLayer) as any;
  const MarkerComponent = (isMapbox ? Marker : MapLibreMarker) as any;
  const NavigationControlComponent = (
    isMapbox ? NavigationControl : MapLibreNavigationControl
  ) as any;
  const FullscreenControlComponent = (
    isMapbox ? FullscreenControl : MapLibreFullscreenControl
  ) as any;
  const mapProviderProps = isMapbox
    ? { mapboxAccessToken: mapboxToken ?? undefined }
    : {};

  // Memoize the GeoJSON data
  const lineData = React.useMemo(() => {
    if (!positions || positions.length === 0) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: positions.map(p => [p.lon, p.lat])
      }
    };
  }, [positions]);

  const pointsData = React.useMemo(() => {
    if (!positions || positions.length === 0) return null;

    return {
      type: 'FeatureCollection' as const,
      features: positions.map((p, index) => ({
        type: 'Feature' as const,
        properties: { index },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon, p.lat]
        }
      }))
    };
  }, [positions]);

  // Auto-fit bounds when positions change
  React.useEffect(() => {
    if (!mapRef.current || positions.length === 0) return;

    if (positions.length === 1) {
      mapRef.current.flyTo({
        center: [positions[0].lon, positions[0].lat],
        zoom: 14,
        duration: 1000,
      });
      return;
    }

    const initial = positions[0];
    const bounds = positions.slice(1).reduce(
      (acc, point) => ({
        minLon: Math.min(acc.minLon, point.lon),
        minLat: Math.min(acc.minLat, point.lat),
        maxLon: Math.max(acc.maxLon, point.lon),
        maxLat: Math.max(acc.maxLat, point.lat),
      }),
      {
        minLon: initial.lon,
        minLat: initial.lat,
        maxLon: initial.lon,
        maxLat: initial.lat,
      },
    );

    mapRef.current.fitBounds(
      [
        [bounds.minLon, bounds.minLat],
        [bounds.maxLon, bounds.maxLat],
      ],
      { padding: 50, duration: 1000 },
    );
  }, [positions]);

  const mapStyle = React.useMemo(() => {
    if (isMapbox) {
      return theme === 'light'
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/dark-v11';
    }

    return theme === 'light'
      ? 'https://tiles.openfreemap.org/styles/positron'
      : 'https://tiles.openfreemap.org/styles/liberty';
  }, [isMapbox, theme]);

  React.useEffect(() => {
    const handleResize = () => {
      const map = mapRef.current?.getMap?.();
      map?.resize();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (mapConfigError) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary/20 text-muted-foreground p-6 text-center">
        <div>
          <p className="font-semibold mb-2">Map Configuration Error</p>
          <p className="text-sm">Failed to load map provider settings.</p>
        </div>
      </div>
    );
  }

  if (!providerOverride && !mapProviderData) {
    return null;
  }

  if (isMapbox && !mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary/20 text-muted-foreground p-6 text-center">
        <div>
          <p className="font-semibold mb-2">Mapbox Token Missing</p>
          <p className="text-sm">Set it in onboarding or Settings, or switch provider to MapLibre + OpenFreeMap.</p>
        </div>
      </div>
    );
  }
  const showLine = displayMode === 'path' || displayMode === 'both';
  const showPoints = displayMode === 'points' || displayMode === 'both';

  return (
    <div className="w-full h-full rounded-none md:rounded-lg overflow-hidden border bg-background relative">
      <MapComponent
        key={mapProvider}
        ref={mapRef}
        initialViewState={{
          longitude: -122.4,
          latitude: 37.8,
          zoom: 10
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        {...mapProviderProps}
        attributionControl={false}
        onLoad={handleMapLoad}
      >
        <FullscreenControlComponent position="top-right" />
        <NavigationControlComponent position="top-right" />

        {/* Trajectory Line */}
        {lineData && showLine && (
          <SourceComponent id="polyline-source" type="geojson" data={lineData}>
            <LayerComponent
              id="line-layer"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round"
              }}
              paint={{
                "line-color": "#3b82f6", // Blue-500
                "line-width": 4,
                "line-opacity": 0.8
              }}
            />
          </SourceComponent>
        )}

        {/* Point Cloud */}
        {pointsData && showPoints && (
          <SourceComponent id="points-source" type="geojson" data={pointsData}>
            <LayerComponent
              id="points-layer"
              type="circle"
              paint={{
                "circle-radius": 4,
                "circle-color": "#7dd3fc", // Sky-300
                "circle-opacity": 0.8,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#111827"
              }}
            />
          </SourceComponent>
        )}

        {/* Current Playback Marker */}
        {currentPosition && (
          <MarkerComponent 
            longitude={currentPosition.lon} 
            latitude={currentPosition.lat} 
            anchor="bottom"
          >
            <div className="relative flex flex-col items-center" aria-label="Current device position">
               <div className="w-8 h-8 text-blue-500 filter drop-shadow-lg">
                 <MapPin className="w-full h-full fill-blue-500 text-white" />
               </div>
               <div className="w-2 h-2 bg-blue-500 rounded-full mt-[-2px]" />
            </div>
          </MarkerComponent>
        )}
      </MapComponent>
      {/* Top Interaction Layer */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
        {/* Left: Device Info Card */}
        <div className="pointer-events-auto">
          {/* Assuming 'Card' is a component you have defined elsewhere, e.g., from shadcn/ui */}
          {/* <Card className="border-0 shadow-lg bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg">
            <CardHeader>
              <CardTitle>Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Lat: {currentPosition?.lat.toFixed(4)}</p>
              <p>Lon: {currentPosition?.lon.toFixed(4)}</p>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
}
