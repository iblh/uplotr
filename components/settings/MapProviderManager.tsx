"use client";

import * as React from "react";
import useSWR from "swr";
import { Globe, Map, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MapProvider = "MAPBOX" | "OPENFREEMAP";

interface MapProviderResponse {
  provider: MapProvider;
  defaultProvider: MapProvider;
  supportedProviders: MapProvider[];
  mapboxToken: string | null;
}

const MAP_PROVIDER_OPTIONS: Array<{
  value: MapProvider;
  label: string;
  description: string;
  note: string;
}> = [
  {
    value: "MAPBOX",
    label: "Mapbox",
    description: "Best if you rely on Mapbox basemap styles and token-based hosting.",
    note: "Requires a Mapbox token.",
  },
  {
    value: "OPENFREEMAP",
    label: "MapLibre + OpenFreeMap",
    description: "Free and open stack based on MapLibre GL JS.",
    note: "No Mapbox token required.",
  },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load map provider settings");
  return res.json() as Promise<MapProviderResponse>;
};

export function MapProviderManager() {
  const { data, error, mutate } = useSWR<MapProviderResponse>(
    "/api/settings/map-provider",
    fetcher,
  );
  const [savingProvider, setSavingProvider] = React.useState<MapProvider | null>(null);
  const [savingToken, setSavingToken] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [mapboxTokenInput, setMapboxTokenInput] = React.useState("");

  const currentProvider = data?.provider;
  const currentMapboxToken = data?.mapboxToken || "";
  const availableOptions = React.useMemo(
    () =>
      MAP_PROVIDER_OPTIONS.filter((option) =>
        data?.supportedProviders?.length
          ? data.supportedProviders.includes(option.value)
          : true,
      ),
    [data?.supportedProviders],
  );

  React.useEffect(() => {
    if (data) {
      setMapboxTokenInput(data.mapboxToken || "");
    }
  }, [data]);

  const setProvider = async (nextProvider: MapProvider) => {
    if (!data || nextProvider === currentProvider) return;

    setSavingProvider(nextProvider);
    setSaveError(null);

    try {
      const res = await fetch("/api/settings/map-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: nextProvider }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to save map provider");
      }

      await mutate(
        {
          ...data,
          provider: payload.provider,
          supportedProviders: payload.supportedProviders || data.supportedProviders,
          mapboxToken:
            payload.mapboxToken === undefined ? data.mapboxToken : payload.mapboxToken,
        },
        { revalidate: false },
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save map provider");
    } finally {
      setSavingProvider(null);
    }
  };

  const saveMapboxToken = async () => {
    if (!data) return;
    setSavingToken(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/settings/map-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapboxToken: mapboxTokenInput }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to save Mapbox token");
      }

      await mutate(
        {
          ...data,
          mapboxToken: payload.mapboxToken ?? null,
        },
        { revalidate: false },
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save Mapbox token");
    } finally {
      setSavingToken(false);
    }
  };

  const getIcon = (provider: MapProvider) => {
    if (provider === "MAPBOX") return <Map className="h-5 w-5" />;
    return <Globe className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">Map provider</h3>
        <p className="text-sm text-muted-foreground">
          Choose between Mapbox and MapLibre + OpenFreeMap for map rendering.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Unable to load map provider settings.
        </div>
      ) : !data ? (
        <div className="h-24 w-full animate-pulse rounded-md bg-muted/30" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {availableOptions.map((option) => {
              const isSelected = option.value === currentProvider;
              const isSaving = savingProvider === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setProvider(option.value)}
                  disabled={Boolean(savingProvider)}
                  className={[
                    "relative rounded-md border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary/35 bg-primary/10"
                      : "border-border/40 bg-background/70 hover:border-border/70 hover:bg-background/90",
                    Boolean(savingProvider) ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`rounded-md p-2 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getIcon(option.value)}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                      <div className="text-[11px] text-muted-foreground/90">{option.note}</div>
                    </div>
                  </div>

                  {isSaving && (
                    <span className="absolute right-3 top-3 text-primary">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/70 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Current provider: <strong className="text-foreground">{currentProvider}</strong>
            </span>
            {saveError && <span className="text-xs font-medium text-destructive">{saveError}</span>}
          </div>

          {currentProvider === "MAPBOX" && (
            <div className="space-y-2 rounded-md border border-border/40 bg-background/70 p-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Mapbox token
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={mapboxTokenInput}
                  onChange={(e) => setMapboxTokenInput(e.target.value)}
                  placeholder="pk.eyJ1Ijo..."
                  autoComplete="off"
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={saveMapboxToken}
                  disabled={savingToken || mapboxTokenInput === currentMapboxToken}
                  className="sm:min-w-[110px]"
                >
                  {savingToken ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Save token"
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Stored in database. Leave empty and save to clear database value (env fallback still applies).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
