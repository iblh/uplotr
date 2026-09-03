"use client";

import * as React from 'react';
import useSWR from 'swr';
import { HardDrive, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
};

export function DataRetentionManager() {
    const { data, error, mutate } = useSWR('/api/settings/data-retention', fetcher);

    const [days, setDays] = React.useState<string>('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [saveMessage, setSaveMessage] = React.useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const [isCleaning, setIsCleaning] = React.useState(false);
    const [cleanupResult, setCleanupResult] = React.useState<{
        positions: number;
        events: number;
    } | null>(null);

    React.useEffect(() => {
        if (data?.days) {
            setDays(data.days.toString());
        }
    }, [data]);

    const handleSave = async () => {
        const val = Number.parseInt(days, 10);
        if (Number.isNaN(val) || val < 1) {
            setSaveMessage({ type: 'error', text: 'Please enter a valid number of days (min 1).' });
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);
        try {
            const res = await fetch('/api/settings/data-retention', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: val }),
            });
            if (!res.ok) throw new Error('Failed to save retention policy');
            await mutate();
            setSaveMessage({ type: 'success', text: 'Retention policy updated successfully.' });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: 'Error saving policy.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleManualCleanup = async () => {
        setIsCleaning(true);
        setCleanupResult(null);
        try {
            const res = await fetch('/api/maintenance/cleanup', { method: 'POST' });
            if (!res.ok) throw new Error('Cleanup failed');
            const json = await res.json();
            setCleanupResult({ positions: json.deleted.positions, events: json.deleted.events });
        } catch {
            setSaveMessage({
                type: 'error',
                text: 'Manual cleanup failed. Make sure you are authorized.',
            });
        } finally {
            setIsCleaning(false);
        }
    };

    return (
        <div className="space-y-5">
            <section className="space-y-4 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                <div className="flex flex-col gap-1">
                    <h3 className="text-base font-medium">Automatic purge policy</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Nightly cleanup keeps only recent records. Set how many days of position/event
                        history should be preserved.
                    </p>
                </div>

                {error ? (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        Unable to load retention settings.
                    </div>
                ) : !data ? (
                    <div className="h-20 animate-pulse rounded-md bg-muted/30" />
                ) : (
                    <div className="flex max-w-sm flex-col items-end gap-3 sm:flex-row sm:gap-4">
                        <div className="w-full space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Keep data for (days)
                            </label>
                            <Input
                                type="number"
                                min="1"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="border-border/40 bg-background/80 font-mono"
                                placeholder="e.g. 30"
                            />
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || days === data.days.toString()}
                            className="w-full min-w-[100px] shadow-sm sm:w-auto"
                        >
                            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                    </div>
                )}

                {saveMessage && (
                    <p
                        className={`text-xs font-medium ${
                            saveMessage.type === 'error' ? 'text-destructive' : 'text-emerald-500'
                        }`}
                    >
                        {saveMessage.text}
                    </p>
                )}
            </section>

            <section className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/[0.04] p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h3 className="flex items-center gap-2 text-base font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Manual database cleanup
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Force immediate cleanup using the currently saved retention policy.
                    </p>
                </div>

                <div className="rounded-md border border-destructive/20 bg-background/70 p-4">
                    {cleanupResult ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                                <Trash2 className="h-4 w-4" />
                                Cleanup completed successfully
                            </div>
                            <div className="grid max-w-xs grid-cols-2 gap-3">
                                <div className="flex flex-col items-center rounded-md bg-muted px-4 py-3">
                                    <span className="text-2xl font-bold">
                                        {cleanupResult.positions.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Positions
                                    </span>
                                </div>
                                <div className="flex flex-col items-center rounded-md bg-muted px-4 py-3">
                                    <span className="text-2xl font-bold">
                                        {cleanupResult.events.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Events
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCleanupResult(null)}
                                className="mt-2 border-border/50 bg-background/80 text-xs"
                            >
                                Acknowledge
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={handleManualCleanup}
                            disabled={isCleaning}
                            className="w-full font-semibold shadow-sm sm:w-auto"
                        >
                            {isCleaning ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Cleaning database...
                                </>
                            ) : (
                                <>
                                    <HardDrive className="mr-2 h-4 w-4" />
                                    Run cleanup now
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </section>
        </div>
    );
}
