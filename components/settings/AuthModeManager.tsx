"use client";

import * as React from 'react';
import useSWR from 'swr';
import { ShieldCheck, Shield, ShieldOff } from 'lucide-react';

type AuthMode = 'OFF' | 'OPTIONAL' | 'REQUIRED';

interface AuthModeResponse {
    mode: AuthMode;
    defaultMode: AuthMode;
    supportedModes: AuthMode[];
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load auth mode');
    return res.json() as Promise<AuthModeResponse>;
};

const MODE_OPTIONS: Array<{ value: AuthMode; label: string; description: string }> = [
    {
        value: 'OFF',
        label: 'Off',
        description: 'No authentication required. Any source can post data.',
    },
    {
        value: 'OPTIONAL',
        label: 'Optional',
        description: 'Requests without a key are accepted, but invalid keys are rejected.',
    },
    {
        value: 'REQUIRED',
        label: 'Required',
        description: 'All requests must include a valid API key.',
    },
];

export function AuthModeManager() {
    const { data, error, mutate } = useSWR<AuthModeResponse>('/api/settings/auth-mode', fetcher);
    const [savingMode, setSavingMode] = React.useState<AuthMode | null>(null);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const currentMode = data?.mode;
    const availableOptions = React.useMemo(
        () =>
            MODE_OPTIONS.filter((option) =>
                data?.supportedModes?.length ? data.supportedModes.includes(option.value) : true,
            ),
        [data?.supportedModes],
    );

    const setMode = async (nextMode: AuthMode) => {
        if (!data || nextMode === currentMode) return;

        setSavingMode(nextMode);
        setSaveError(null);

        try {
            const res = await fetch('/api/settings/auth-mode', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: nextMode }),
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload?.error || 'Failed to save auth mode');
            }

            await mutate(
                {
                    ...data,
                    mode: payload.mode,
                    supportedModes: payload.supportedModes || data.supportedModes,
                },
                { revalidate: false },
            );
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save auth mode');
        } finally {
            setSavingMode(null);
        }
    };

    const getIcon = (mode: AuthMode) => {
        switch (mode) {
            case 'REQUIRED':
                return <ShieldCheck className="h-5 w-5" />;
            case 'OPTIONAL':
                return <Shield className="h-5 w-5" />;
            case 'OFF':
                return <ShieldOff className="h-5 w-5" />;
            default:
                return <Shield className="h-5 w-5" />;
        }
    };

    return (
        <div className="space-y-4 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium">Authentication mode</h3>
                <p className="text-sm text-muted-foreground">
                    Control how strict the system validates incoming data sources.
                </p>
            </div>

            {error ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Unable to load current settings.
                </div>
            ) : !data ? (
                <div className="h-24 w-full animate-pulse rounded-md bg-muted/30" />
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {availableOptions.map((option) => {
                            const isSelected = option.value === currentMode;
                            const isSaving = savingMode === option.value;

                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setMode(option.value)}
                                    disabled={Boolean(savingMode)}
                                    className={[
                                        'relative flex flex-col items-center gap-2 rounded-md border p-2 text-center transition-all sm:items-start sm:p-3 sm:text-left',
                                        isSelected
                                            ? 'border-primary/35 bg-primary/10'
                                            : 'border-border/40 bg-background/70 hover:border-border/70 hover:bg-background/90',
                                        Boolean(savingMode) ? 'cursor-not-allowed opacity-60' : '',
                                    ].join(' ')}
                                >
                                    <div
                                        className={`rounded-md p-1.5 sm:p-2 ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {getIcon(option.value)}
                                    </div>
                                    <div className="space-y-0.5 sm:space-y-1">
                                        <div className="text-xs font-semibold sm:text-sm">
                                            {option.label}
                                        </div>
                                        <div className="hidden text-xs leading-snug text-muted-foreground sm:block">
                                            {option.description}
                                        </div>
                                    </div>
                                    {isSaving && (
                                        <span className="absolute right-2 top-2 flex h-2 w-2 sm:right-3 sm:top-3">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/70 px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                            Current mode: <strong className="text-foreground">{currentMode}</strong>
                        </span>
                        {saveError && <span className="text-xs font-medium text-destructive">{saveError}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
