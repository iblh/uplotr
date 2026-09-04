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
import { cn } from '@/lib/utils';

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
  fitPositions?: Position[];
  interactive?: boolean;
  showControls?: boolean;
  routeColor?: string;
  pointStride?: number;
  className?: string;
}

export function MapContainer({
  positions,
  currentPosition,
  displayMode,
  providerOverride,
  mapboxTokenOverride,
  fitPositions,
  interactive = true,
  showControls = true,
  routeColor = '#3b82f6',
  pointStride = 1,
  className,
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

    const normalizedStride = Math.max(1, Math.floor(pointStride));
    const sampledPositions = positions.flatMap((position, index) => (
      index === 0 || index === positions.length - 1 || index % normalizedStride === 0
        ? [{ position, index }]
        : []
    ));

    return {
      type: 'FeatureCollection' as const,
      features: sampledPositions.map(({ position, index }) => ({
        type: 'Feature' as const,
        properties: { index },
        geometry: {
          type: 'Point' as const,
          coordinates: [position.lon, position.lat]
        }
      }))
    };
  }, [pointStride, positions]);

  const boundsPositions = fitPositions ?? positions;

  // Auto-fit to the full route. Playback can draw a partial route without moving the camera.
  React.useEffect(() => {
    if (!mapRef.current || boundsPositions.length === 0) return;

    if (boundsPositions.length === 1) {
      mapRef.current.flyTo({
        center: [boundsPositions[0].lon, boundsPositions[0].lat],
        zoom: 14,
        duration: 1000,
      });
      return;
    }

    const initial = boundsPositions[0];
    const bounds = boundsPositions.slice(1).reduce(
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
  }, [boundsPositions]);

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
    <div className={cn("relative h-full w-full overflow-hidden rounded-none border bg-background md:rounded-lg", className)}>
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
        interactive={interactive}
        attributionControl
        onLoad={handleMapLoad}
      >
        {showControls && <FullscreenControlComponent position="top-right" />}
        {showControls && <NavigationControlComponent position="top-right" />}

        {/* Trajectory Line */}
        {lineData && showLine && (
          <SourceComponent id="polyline-source" type="geojson" data={lineData}>
            <LayerComponent
              id="line-shadow-layer"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round"
              }}
              paint={{
                "line-color": routeColor,
                "line-width": 10,
                "line-opacity": 0.2,
                "line-blur": 4,
              }}
            />
            <LayerComponent
              id="line-layer"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round"
              }}
              paint={{
                "line-color": routeColor,
                "line-width": 4,
                "line-opacity": 0.95
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
                "circle-radius": 3.5,
                "circle-color": "#bae6fd",
                "circle-opacity": 0.9,
                "circle-stroke-width": 1.5,
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
               <div className="h-8 w-8 drop-shadow-lg" style={{ color: routeColor }}>
                 <MapPin className="h-full w-full fill-current stroke-white" />
               </div>
               <div className="mt-[-2px] h-2 w-2 rounded-full" style={{ backgroundColor: routeColor }} />
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
