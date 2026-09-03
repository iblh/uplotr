'use client';

import * as React from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { FileJson, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DeviceEvent {
    id: string;
    ts: string;
    payload: any;
}

export function DeviceLogs({ deviceId }: { deviceId: string }) {
    const {
        data: events,
        error,
        isLoading,
        mutate,
    } = useSWR<DeviceEvent[]>(deviceId ? `/api/events?deviceId=${deviceId}` : null, fetcher, {
        refreshInterval: 10000,
    });

    if (!deviceId)
        return (
            <div className="p-4 text-center text-muted-foreground">
                Select a device to view logs.
            </div>
        );
    if (error) return <div className="p-4 text-center text-red-500">Failed to load logs.</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b bg-muted/10">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5" />
                    Raw Payloads (Last 20)
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => mutate()}>
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading && !events && (
                    <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                        Loading logs...
                    </div>
                )}

                {events?.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                        No events recorded.
                    </div>
                )}

                {events?.map((event) => (
                    <div
                        key={event.id}
                        className="text-[10px] font-mono border rounded bg-card p-2 space-y-1"
                    >
                        <div className="flex items-center justify-between text-muted-foreground border-b pb-1 mb-1 border-dashed border-muted">
                            <span>{new Date(event.ts).toLocaleString()}</span>
                            <span>
                                {formatDistanceToNow(new Date(event.ts), { addSuffix: true })}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-all text-foreground/80">
                                {JSON.stringify(event.payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
