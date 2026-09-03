'use client';

import * as React from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Device, Position } from '@prisma/client';
import { DeviceList } from '@/components/DeviceList';
import { MapContainer } from '@/components/map/MapContainer';
import { InfoPanel } from '@/components/InfoPanel';
import { EmptyState } from '@/components/EmptyState';
import { ModeToggle } from '@/components/mode-toggle';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Play,
    Pause,
    LogOut,
    UserCircle,
    Check,
    ChevronDown,
    CalendarRange,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, subHours } from 'date-fns';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fetch failed');
    }
    return res.json();
};

const RANGES = [
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
];

const MAP_MODES = [
    { label: 'Path', value: 'path' },
    { label: 'Points', value: 'points' },
    { label: 'Both', value: 'both' },
];

const toDateTimeLocalValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

export default function Dashboard() {
    const router = useRouter();
    const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
    const [timeRange, setTimeRange] = React.useState('24h');
    const [filterMode, setFilterMode] = React.useState<'preset' | 'custom'>('preset');
    const [isCustomRangeOpen, setIsCustomRangeOpen] = React.useState(false);
    const [customFromInput, setCustomFromInput] = React.useState(() =>
        toDateTimeLocalValue(subHours(new Date(), 24)),
    );
    const [customToInput, setCustomToInput] = React.useState(() =>
        toDateTimeLocalValue(new Date()),
    );
    const [appliedCustomRange, setAppliedCustomRange] = React.useState<{
        from: string;
        to: string;
    } | null>(null);
    const [customRangeError, setCustomRangeError] = React.useState<string | null>(null);
    const [mapMode, setMapMode] = React.useState<'path' | 'points' | 'both'>('both');

    // Playback State
    const [playbackIndex, setPlaybackIndex] = React.useState<number>(-1); // -1 = Live/Latest
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackSpeed, setPlaybackSpeed] = React.useState(1); // 1x, 2x, 5x, 10x

    // Data Fetching
    const {
        data: devices,
        isLoading: devicesLoading,
        mutate: mutateDevices,
    } = useSWR<Device[]>('/api/devices', fetcher, {
        refreshInterval: 30000,
    });
    const { data: profile } = useSWR<{ username: string; role: string }>('/api/auth/me', fetcher);
    const canManage = profile?.role === 'admin';

    const positionsEndpoint = React.useMemo(() => {
        if (!selectedDeviceId) return null;
        const params = new URLSearchParams({ deviceId: selectedDeviceId });

        if (filterMode === 'custom' && appliedCustomRange) {
            params.set('from', appliedCustomRange.from);
            params.set('to', appliedCustomRange.to);
        } else {
            params.set('range', timeRange);
        }

        return `/api/positions?${params.toString()}`;
    }, [selectedDeviceId, filterMode, appliedCustomRange, timeRange]);

    const { data: positions } = useSWR<Position[]>(positionsEndpoint, fetcher, {
        refreshInterval: isPlaying || filterMode === 'custom' ? 0 : 10000, // Stop polling while replaying or when viewing a fixed custom window
    });

    // Auto-select first device if none selected
    React.useEffect(() => {
        if (!selectedDeviceId && devices && devices.length > 0) {
            setSelectedDeviceId(devices[0].id);
        }
    }, [devices, selectedDeviceId]);

    // Reset playback when data/device changes
    React.useEffect(() => {
        setPlaybackIndex(-1);
        setIsPlaying(false);
    }, [selectedDeviceId, positionsEndpoint, positions?.length]);

    const handleSelectPresetRange = React.useCallback((range: string) => {
        setTimeRange(range);
        setFilterMode('preset');
        setIsCustomRangeOpen(false);
        setCustomRangeError(null);
    }, []);

    const handleApplyCustomRange = React.useCallback(() => {
        if (!customFromInput || !customToInput) {
            setCustomRangeError('Please select both start and end time.');
            return;
        }

        const from = new Date(customFromInput);
        const to = new Date(customToInput);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            setCustomRangeError('Invalid time range.');
            return;
        }
        if (from >= to) {
            setCustomRangeError('End time must be later than start time.');
            return;
        }

        setAppliedCustomRange({ from: from.toISOString(), to: to.toISOString() });
        setFilterMode('custom');
        setIsCustomRangeOpen(false);
        setCustomRangeError(null);
    }, [customFromInput, customToInput]);

    const activeRangeLabel =
        filterMode === 'custom' && appliedCustomRange
            ? `${format(new Date(appliedCustomRange.from), 'MMM d HH:mm')} - ${format(new Date(appliedCustomRange.to), 'MMM d HH:mm')}`
            : RANGES.find((range) => range.value === timeRange)?.label || timeRange;

    // Playback Loop
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && positions && positions.length > 0) {
            const baseDelay = 400; // 400ms base
            const delay = Math.max(50, baseDelay / playbackSpeed);

            interval = setInterval(() => {
                setPlaybackIndex((prev) => {
                    // Start from beginning if at the end (or was at live state -1)
                    const startIdx = prev === -1 || prev >= positions.length - 1 ? 0 : prev;
                    const next = startIdx + 1;

                    if (next >= positions.length - 1) {
                        setIsPlaying(false);
                        return -1; // Go back to live/end state
                    }
                    return next;
                });
            }, delay);
        }
        return () => clearInterval(interval);
    }, [isPlaying, positions, playbackSpeed]);

    const [isDeviceDrawerOpen, setIsDeviceDrawerOpen] = React.useState(false);
    const safeDevices = Array.isArray(devices) ? devices : [];
    const selectedDevice = safeDevices.find((d) => d.id === selectedDeviceId) as
        | (Device & { status?: 'online' | 'offline' })
        | undefined;

    // Derived State
    const validPositions = Array.isArray(positions) ? positions : [];
    const currentDisplayIndex = playbackIndex === -1 ? validPositions.length - 1 : playbackIndex;
    const currentPosition = validPositions[currentDisplayIndex] || null;

    // Mobile Copy State
    const [isMobileCoordsCopied, setIsMobileCoordsCopied] = React.useState(false);

    const handleMobileCopy = React.useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent bubbling if needed
            if (!currentPosition) return;
            const text = `${currentPosition.lat.toFixed(6)}, ${currentPosition.lon.toFixed(6)}`;
            navigator.clipboard.writeText(text);
            setIsMobileCoordsCopied(true);
            setTimeout(() => setIsMobileCoordsCopied(false), 2000);
        },
        [currentPosition],
    );

    const handleUpdate = React.useCallback(
        async (id: string, data: { name?: string; group?: string; tags?: string[] }) => {
            const res = await fetch('/api/devices', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update device');
            }

            await mutateDevices();
        },
        [mutateDevices],
    );

    const handleLogout = React.useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            router.replace('/login');
        }
    }, [router]);

    // Derived state for empty state display
    const isListEmpty = devices && devices.length === 0;
    const showEmptyState = isListEmpty && !devicesLoading;

    const isSelectedOnline = selectedDevice?.status === 'online';

    return (
        <div className="flex h-[100svh] w-full bg-background overflow-hidden flex-col md:flex-row relative">
            {/* MOBILE HEADER: Context & Selection */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-40 px-3 py-2 pointer-events-none flex justify-center">
                <div className="flex items-center gap-2 pointer-events-auto shadow-sm">
                    <button
                        onClick={() => setIsDeviceDrawerOpen(true)}
                        className="flex items-center gap-2.5 bg-background/80 backdrop-blur-xl border border-border/40 rounded-md pl-1.5 pr-3 py-1 h-9 active:scale-95 transition-transform"
                    >
                        <div
                            className={cn(
                                'w-6 h-6 rounded-md flex items-center justify-center',
                                isSelectedOnline
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <div
                                className={cn(
                                    'w-2 h-2 rounded-full',
                                    isSelectedOnline
                                        ? 'bg-green-500 animate-pulse'
                                        : 'bg-muted-foreground/50',
                                )}
                            />
                        </div>
                        <div className="flex flex-col items-start leading-none pr-1">
                            <span className="text-xs font-bold text-foreground">
                                {selectedDevice?.name || 'Select Device'}
                            </span>
                            {selectedDevice?.lastSeen ? (
                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                    {formatDistanceToNow(new Date(selectedDevice.lastSeen))} ago
                                </span>
                            ) : (
                                <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                    Offline
                                </span>
                            )}
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                </div>
            </div>

            {/* MOBILE DEVICE DRAWER (Sheet Style) */}
            <div
                className={cn(
                    'md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
                    isDeviceDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
                onClick={() => setIsDeviceDrawerOpen(false)}
            />
            <div
                className={cn(
                    'md:hidden fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-lg transition-all duration-500 ease-out flex flex-col h-[calc(100vh-60px)] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]',
                    isDeviceDrawerOpen ? 'translate-y-0' : 'translate-y-full',
                )}
            >
                {/* Sheet Handle */}
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-sm bg-muted/40" />
                </div>

                <div className="px-5 py-3 flex items-center justify-between border-b border-border/40">
                    <h2 className="text-sm font-bold tracking-tight text-muted-foreground uppercase">
                        Device List
                    </h2>
                    <div className="flex items-center gap-2">
                        {canManage ? <SettingsDialog /> : null}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-md h-8 w-8 hover:bg-muted"
                            onClick={() => setIsDeviceDrawerOpen(false)}
                            aria-label="Close device list"
                        >
                            <ChevronDown className="h-5 w-5 opacity-50" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-muted/5">
                    <DeviceList
                        devices={devices || []}
                        selectedId={selectedDeviceId}
                        onSelect={(id) => {
                            setSelectedDeviceId(id);
                            setIsDeviceDrawerOpen(false);
                        }}
                        isLoading={devicesLoading}
                        onUpdate={handleUpdate}
                        canManage={canManage}
                    />
                </div>

                <div className="p-4 border-t bg-background/80 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                                <UserCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-xs leading-tight">
                                    {profile?.username || 'Admin'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Online</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                            onClick={handleLogout}
                            aria-label="Log out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Left Sidebar (Desktop Only) */}
            <aside className="hidden md:flex w-[340px] flex-shrink-0 bg-gradient-to-b from-background via-background/95 to-muted/20 backdrop-blur-xl flex-col z-20">
                <div className="px-3 py-1">
                    <div className="rounded-lg bg-background/50 px-3 py-2">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                                <Image
                                    src="/logo.svg"
                                    alt="uplotr logo"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 dark:brightness-0 dark:invert"
                                />
                                uplotr
                            </h1>
                            <ModeToggle />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3">
                    <div className="h-full overflow-hidden rounded-lg bg-background/55">
                        <DeviceList
                            devices={devices || []}
                            selectedId={selectedDeviceId}
                            onSelect={setSelectedDeviceId}
                            isLoading={devicesLoading}
                            onUpdate={handleUpdate}
                            canManage={canManage}
                        />
                    </div>
                </div>

                {/* Desktop Profile Footer */}
                <div className="p-3 pt-0">
                    <div className="rounded-lg bg-background/55 px-3 py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                <UserCircle className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-xs font-medium truncate">
                                    {profile?.username || 'Admin'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    System Operator
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {canManage ? <SettingsDialog /> : null}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={handleLogout}
                                title="Logout"
                                aria-label="Log out"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative flex flex-col min-h-0">
                {/* Map View */}
                <div className="absolute inset-0 w-full h-full bg-secondary/10 md:pt-2 md:pb-2 md:pr-2">
                    {showEmptyState ? (
                        <div className="absolute inset-0 md:inset-x-2 md:inset-y-2 z-30 rounded-none md:rounded-lg overflow-hidden bg-background">
                            <EmptyState />
                        </div>
                    ) : null}

                    <MapContainer
                        positions={validPositions}
                        currentPosition={currentPosition}
                        displayMode={mapMode}
                    />

                    {/* Top Overlay: Time Range (Adjusted top position for mobile to clear the new header) */}
                    <div className="absolute top-[52px] left-0 right-0 z-10 flex flex-col items-center gap-2 pointer-events-none md:top-4 md:left-4 md:right-auto md:items-start">
                        <div className="flex items-center gap-2">
                            <div className="bg-background/80 backdrop-blur-xl border border-border/40 rounded-md shadow-sm p-0.5 flex gap-0.5 pointer-events-auto">
                                {RANGES.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => handleSelectPresetRange(r.value)}
                                        className={cn(
                                            'px-2 py-1 text-[9px] md:px-3 md:text-xs font-bold rounded-sm transition-all min-w-[32px]',
                                            filterMode === 'preset' && timeRange === r.value
                                                ? 'bg-primary text-primary-foreground shadow-sm scale-100'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground scale-95',
                                        )}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setIsCustomRangeOpen((prev) => !prev);
                                        setCustomRangeError(null);
                                    }}
                                    className={cn(
                                        'px-2 py-1 text-[9px] md:px-3 md:text-xs font-bold rounded-sm transition-all inline-flex items-center gap-1',
                                        filterMode === 'custom' || isCustomRangeOpen
                                            ? 'bg-primary text-primary-foreground shadow-sm scale-100'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground scale-95',
                                    )}
                                >
                                    <CalendarRange className="h-3 w-3" />
                                    <span>Custom</span>
                                </button>
                            </div>
                            <div className="bg-background/80 backdrop-blur-xl border border-border/40 rounded-md shadow-sm p-0.5 flex gap-0.5 pointer-events-auto">
                                {MAP_MODES.map((mode) => (
                                    <button
                                        key={mode.value}
                                        onClick={() =>
                                            setMapMode(mode.value as 'path' | 'points' | 'both')
                                        }
                                        className={cn(
                                            'px-2 py-1 text-[9px] md:px-3 md:text-xs font-bold rounded-sm transition-all',
                                            mapMode === mode.value
                                                ? 'bg-primary text-primary-foreground shadow-sm scale-100'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground scale-95',
                                        )}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isCustomRangeOpen && (
                            <div className="w-[92vw] max-w-[420px] md:w-[420px] rounded-md border border-border/40 bg-background/85 backdrop-blur-xl shadow-lg p-2.5 pointer-events-auto">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            From
                                        </span>
                                        <Input
                                            type="datetime-local"
                                            value={customFromInput}
                                            onChange={(e) => setCustomFromInput(e.target.value)}
                                            className="h-8 text-xs font-medium"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            To
                                        </span>
                                        <Input
                                            type="datetime-local"
                                            value={customToInput}
                                            onChange={(e) => setCustomToInput(e.target.value)}
                                            className="h-8 text-xs font-medium"
                                        />
                                    </label>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2 text-[11px]"
                                        onClick={() => {
                                            const now = new Date();
                                            setCustomFromInput(
                                                toDateTimeLocalValue(subHours(now, 24)),
                                            );
                                            setCustomToInput(toDateTimeLocalValue(now));
                                            setCustomRangeError(null);
                                        }}
                                    >
                                        Last 24h
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-3 text-xs font-semibold"
                                        onClick={handleApplyCustomRange}
                                    >
                                        Apply
                                    </Button>
                                </div>
                                {customRangeError && (
                                    <p className="mt-1 text-[11px] text-destructive font-medium">
                                        {customRangeError}
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedDeviceId && (
                            <div className="hidden md:flex bg-background/60 backdrop-blur-xl border border-white/10 rounded-md shadow-sm px-2.5 py-1.5 items-center gap-2 w-fit pointer-events-auto">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] md:text-xs font-medium text-foreground whitespace-nowrap">
                                    {activeRangeLabel} • {validPositions.length}{' '}
                                    {validPositions.length === 1 ? 'Position' : 'Positions'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Overlay: Controls & Info */}
                    <div className="absolute bottom-3 left-3 right-3 md:bottom-8 md:left-8 md:right-8 z-10 pointer-events-none md:grid md:grid-cols-3 md:items-end md:gap-4">
                        {/* Left Col (Empty for now) */}
                        <div className="hidden md:block" />

                        {/* Center Col: Playback Control Bar */}
                        <div className="md:self-end w-full max-w-xl bg-background/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl p-2 px-4 pointer-events-auto flex flex-col gap-1 md:gap-0 md:flex-row md:items-center md:rounded-lg md:p-1.5 md:px-4 md:mx-auto">
                            {/* Mobile Only: Integrated Info Header */}
                            <div className="md:hidden flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-white/5 pb-1 mb-1 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">
                                        {currentPosition
                                            ? format(new Date(currentPosition.ts), 'HH:mm')
                                            : '--:--'}
                                    </span>
                                    <span>
                                        {currentPosition
                                            ? format(new Date(currentPosition.ts), 'MMM d')
                                            : ''}
                                    </span>
                                </div>
                                <div
                                    onClick={handleMobileCopy}
                                    className="flex items-center gap-1 opacity-80 cursor-pointer active:scale-95 transition-transform"
                                >
                                    {isMobileCoordsCopied ? (
                                        <div className="flex items-center gap-1 text-green-400 font-bold animate-in fade-in slide-in-from-right-1">
                                            <Check className="w-3 h-3" />
                                            <span>Copied</span>
                                        </div>
                                    ) : (
                                        <span>
                                            {currentPosition?.lat.toFixed(4) ?? '0.0000'},{' '}
                                            {currentPosition?.lon.toFixed(4) ?? '0.0000'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full">
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-md hover:bg-primary/10 text-primary flex-shrink-0"
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        disabled={validPositions.length < 2}
                                        aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                                    >
                                        {isPlaying ? (
                                            <Pause className="h-4 w-4 fill-current" />
                                        ) : (
                                            <Play className="h-4 w-4 fill-current ml-0.5" />
                                        )}
                                    </Button>

                                    {/* Speed Selector */}
                                    <div className="hidden md:flex bg-muted/20 rounded-md p-0.5 border border-white/5">
                                        {[1, 2, 5, 10].map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => setPlaybackSpeed(speed)}
                                                className={cn(
                                                    'px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all',
                                                    playbackSpeed === speed
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 px-2">
                                    <Slider
                                        value={[currentDisplayIndex]}
                                        min={0}
                                        max={Math.max(0, validPositions.length - 1)}
                                        step={1}
                                        onValueChange={(val) => {
                                            setIsPlaying(false);
                                            setPlaybackIndex(val[0]);
                                        }}
                                        className="cursor-pointer py-1"
                                        variant="playback"
                                    />
                                </div>

                                <div className="text-[10px] font-mono text-primary min-w-[36px] text-right font-bold hidden md:block">
                                    {playbackIndex === -1
                                        ? 'LIVE'
                                        : (
                                              (currentDisplayIndex /
                                                  Math.max(1, validPositions.length - 1)) *
                                              100
                                          ).toFixed(0) + '%'}
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Info Panel */}
                        <div className="absolute bottom-[90px] right-0 w-auto pointer-events-auto md:static md:flex md:justify-end">
                            <InfoPanel position={currentPosition} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
