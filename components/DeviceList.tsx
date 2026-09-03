"use client";

import * as React from 'react';
import { Device } from '@prisma/client';
import { Battery, Signal, Clock, Search, ChevronDown, ChevronRight, Radar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeviceSettingsDialog } from './settings/DeviceMapperDialog';

interface ExtDevice extends Device {
    status?: 'online' | 'offline';
}

interface DeviceListProps {
    devices: ExtDevice[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    isLoading: boolean;
    onUpdate: (id: string, data: { name?: string; group?: string; tags?: string[] }) => Promise<void>;
    canManage?: boolean;
}

export function DeviceList({ devices, selectedId, onSelect, isLoading, onUpdate, canManage = false }: DeviceListProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
        Default: true,
    });

    if (isLoading) {
        return (
            <div className="p-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 animate-pulse">
                Scanning frequencies...
            </div>
        );
    }

    if (devices.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <div className="rounded-lg border border-border/40 bg-background/60 p-4 backdrop-blur-xl shadow-sm">
                    <Radar className="mx-auto h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="mt-4 text-sm font-semibold tracking-tight">No devices connected</h3>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                    Connect your devices via webhook to begin real-time tracking.
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 h-8 rounded-md border-border/50 bg-background/70 px-4 text-xs"
                    asChild
                >
                    <a href="/docs/DEVICE_SETUP.md" target="_blank" rel="noopener noreferrer">
                        Setup guide
                    </a>
                </Button>
            </div>
        );
    }

    const filteredDevices = devices.filter((device) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            device.name?.toLowerCase().includes(searchLower) ||
            device.externalId?.toLowerCase().includes(searchLower) ||
            device.id.toLowerCase().includes(searchLower) ||
            device.group?.toLowerCase().includes(searchLower) ||
            device.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
    });

    const groupedDevices = filteredDevices.reduce(
        (acc, device) => {
            const groupName = device.group || 'Default';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(device);
            return acc;
        },
        {} as Record<string, ExtDevice[]>,
    );

    const sortedGroups = Object.keys(groupedDevices).sort((a, b) => {
        if (a === 'Default') return 1;
        if (b === 'Default') return -1;
        return a.localeCompare(b);
    });

    const onlineCount = filteredDevices.filter((device) => device.status === 'online').length;

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="sticky top-0 z-20 space-y-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                        placeholder="Search by name, id, group, tag..."
                        className="h-9 rounded-md border-border/40 bg-background/70 pl-9 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-primary/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 text-[10px] font-medium">
                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                        {onlineCount} online
                    </span>
                    <span className="rounded-md border border-border/50 bg-muted/40 px-2 py-1 text-muted-foreground">
                        {filteredDevices.length} devices
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
                {sortedGroups.map((groupName) => {
                    const isExpanded = expandedGroups[groupName] !== false;
                    const groupDevices = groupedDevices[groupName];

                    return (
                        <section key={groupName} className="space-y-2">
                            <button
                                onClick={() =>
                                    setExpandedGroups((prev) => ({
                                        ...prev,
                                        [groupName]: !isExpanded,
                                    }))
                                }
                                className="flex w-full items-center gap-2 px-1 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 transition-colors hover:text-foreground"
                                type="button"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                <span className="font-semibold">{groupName}</span>
                                <span className="ml-auto rounded border border-border/50 bg-background/70 px-1.5 py-0.5 text-[9px]">
                                    {groupDevices.length}
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="space-y-2">
                                    {groupDevices.map((device) => {
                                        const isSelected = selectedId === device.id;
                                        const isOnline = device.status === 'online';

                                        return (
                                            <div
                                                key={device.id}
                                                className={cn(
                                                    'group relative rounded-md border bg-background/70 shadow-sm backdrop-blur-xl transition-colors',
                                                    isSelected
                                                        ? 'border-primary/40 bg-primary/[0.06]'
                                                        : 'border-border/40 hover:border-border/70',
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(device.id)}
                                                    className="w-full space-y-3 p-3 pr-12 text-left"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'h-2 w-2 shrink-0 rounded-full',
                                                                    isOnline
                                                                        ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]'
                                                                        : 'bg-muted-foreground/35',
                                                                )}
                                                            />
                                                            <span
                                                                className={cn(
                                                                    'truncate text-sm font-semibold tracking-tight',
                                                                    isSelected
                                                                        ? 'text-primary'
                                                                        : 'text-foreground',
                                                                )}
                                                            >
                                                                {device.name || device.id}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                                                                    isOnline
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-muted text-muted-foreground',
                                                                )}
                                                            >
                                                                {isOnline ? 'online' : 'offline'}
                                                            </span>
                                                        </div>

                                                        <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                                                            <span className="truncate font-mono">
                                                                #{device.externalId || device.id.slice(0, 8)}
                                                            </span>
                                                            {device.group && device.group !== 'Default' && (
                                                                <>
                                                                    <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                                                                    <span className="truncate">{device.group}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-border/30 pt-2 text-[10px]">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {device.lastSeen
                                                                    ? formatDistanceToNow(
                                                                          new Date(device.lastSeen),
                                                                          {
                                                                              addSuffix: true,
                                                                          },
                                                                      )
                                                                    : 'No signal'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-3 font-medium">
                                                            {device.lastBattery !== null && (
                                                                <span
                                                                    className={cn(
                                                                        'flex items-center gap-1',
                                                                        device.lastBattery < 20
                                                                            ? 'text-red-500'
                                                                            : 'text-emerald-600 dark:text-emerald-400',
                                                                    )}
                                                                >
                                                                    <Battery className="h-3 w-3" />
                                                                    {device.lastBattery}%
                                                                </span>
                                                            )}

                                                            {device.lastRssi !== null && (
                                                                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                                                                    <Signal className="h-3 w-3" />
                                                                    {device.lastRssi}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>

                                                {canManage && <div className="absolute right-2 top-2 z-10 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                                                    <div onClick={(event) => event.stopPropagation()}>
                                                        <DeviceSettingsDialog
                                                            deviceId={device.id}
                                                            deviceName={device.name || ''}
                                                            onUpdate={onUpdate}
                                                        />
                                                    </div>
                                                </div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
