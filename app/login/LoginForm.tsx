"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Map,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import packageJson from '@/package.json';

interface LoginFormProps {
  nextPath: string;
}

type MapProvider = "MAPBOX" | "OPENFREEMAP";

interface SetupStatusResponse {
  needsSetup: boolean;
  defaultMapProvider: MapProvider;
  supportedMapProviders: MapProvider[];
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
    description: "Rich basemap styles with full feature compatibility.",
    note: "Requires a Mapbox token (can be stored during onboarding).",
  },
  {
    value: "OPENFREEMAP",
    label: "MapLibre + OpenFreeMap",
    description: "Free and open map stack, no Mapbox token required.",
    note: "Uses public OpenFreeMap style endpoints.",
  },
];

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSetupMode, setIsSetupMode] = React.useState<boolean | null>(null);
  const [mapProvider, setMapProvider] = React.useState<MapProvider>("OPENFREEMAP");
  const [mapboxToken, setMapboxToken] = React.useState("");
  const [supportedMapProviders, setSupportedMapProviders] = React.useState<MapProvider[]>([
    "MAPBOX",
    "OPENFREEMAP",
  ]);

  React.useEffect(() => {
    fetch("/api/auth/setup")
      .then((res) => res.json())
      .then((data: SetupStatusResponse) => {
        setIsSetupMode(data.needsSetup);
        const supported: MapProvider[] =
          data.supportedMapProviders?.length > 0
            ? data.supportedMapProviders
            : ["OPENFREEMAP", "MAPBOX"];
        setSupportedMapProviders(supported);

        const defaultProvider: MapProvider = supported.includes(data.defaultMapProvider)
          ? data.defaultMapProvider
          : supported[0] || "OPENFREEMAP";
        setMapProvider(defaultProvider || "OPENFREEMAP");
      })
      .catch(() => setIsSetupMode(false));
  }, []);

  const availableMapOptions = React.useMemo(
    () =>
      MAP_PROVIDER_OPTIONS.filter((option) =>
        supportedMapProviders.includes(option.value),
      ),
    [supportedMapProviders],
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = isSetupMode ? "/api/auth/setup" : "/api/auth/login";
      const payload = isSetupMode
        ? { username, password, mapProvider, mapboxToken: mapboxToken.trim() }
        : { username, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isSetupMode ? "Setup failed." : "Invalid credentials."));
        return;
      }

      router.replace(nextPath);
      router.refresh(); 
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSetupMode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Initializing uplotr...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 border-r border-white/5 p-12 text-white relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-900/0 to-zinc-900/0" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight" aria-label="uplotr home">
            <Image src="/logo.svg" alt="" width={30} height={30} className="invert" priority />
            <span>uplotr</span>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-sky-300">Beta</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            {isSetupMode ? "Your private tracking console." : "Welcome back."}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            {isSetupMode 
              ? "Deploy self-hosted tracking infrastructure in minutes. Ingest from any source, visualize real-time data, and manage your fleet securely."
              : "Monitor your fleet performance, analyze trajectories, and manage device configurations from your unified dashboard."
            }
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-zinc-500">
          <span>v{packageJson.version}</span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>Open Source</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[360px] space-y-8">
          <Link href="/" className="mx-auto flex w-fit items-center gap-2 text-lg font-semibold lg:hidden" aria-label="uplotr home">
            <Image src="/logo.svg" alt="" width={28} height={28} className="dark:invert" priority />
            <span>uplotr</span>
          </Link>
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isSetupMode ? "Create Admin Account" : "Sign in to Dashboard"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSetupMode 
                ? "Set up your root administrator credentials to get started."
                : "Enter your credentials to access the console."
              }
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin"
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isSetupMode && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Min 8 chars</span>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                minLength={isSetupMode ? 8 : undefined}
                className="bg-background"
              />
            </div>

            {isSetupMode && (
              <div className="space-y-2">
                <Label>Map provider</Label>
                <div className="grid grid-cols-1 gap-2">
                  {availableMapOptions.map((option) => {
                    const isSelected = option.value === mapProvider;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMapProvider(option.value)}
                        className={cn(
                          "rounded-md border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/50 bg-muted/10 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "mt-0.5 rounded-md p-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {option.value === "MAPBOX" ? (
                              <Map className="h-4 w-4" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground/90">
                              {option.note}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isSetupMode && mapProvider === "MAPBOX" && (
              <div className="space-y-2">
                <Label htmlFor="mapbox-token">Mapbox Token</Label>
                <Input
                  id="mapbox-token"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  placeholder="pk.eyJ1Ijo..."
                  autoComplete="off"
                  className="bg-background font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional if MAPBOX_TOKEN env fallback is configured. Stored in database and editable later in Settings.
                </p>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="polite" className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <ShieldCheck className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSetupMode ? "Initialize System" : "Sign In"}
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {isSetupMode && (
            <div className="text-xs text-center text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p>This will be the <strong>Owner</strong> account with full system access.</p>
              <p className="mt-1">You can create more users later in Settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
