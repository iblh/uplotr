'use client';

import * as React from 'react';
import useSWR from 'swr';
import {
    Activity,
    Battery,
    Check,
    Clock,
    LayoutGrid,
    Loader2,
    MapPin,
    Save,
    Settings,
    Signal,
    Terminal,
    Trash2,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { smartParseDate } from '@/lib/mapper-service';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
    deviceId: string;
    deviceName?: string;
    onUpdate?: (
        id: string,
        data: { name?: string; group?: string; tags?: string[] },
    ) => Promise<void>;
}

export function DeviceSettingsDialog({ deviceId, deviceName: initialName, onUpdate }: Props) {
    const [open, setOpen] = React.useState(false);
    const { data, mutate, isLoading, error } = useSWR(
        open ? `/api/devices/${deviceId}/mapping` : null,
        fetcher,
    );

    const [activeTab, setActiveTab] = React.useState<'general' | 'mapping'>('general');
    const [mode, setMode] = React.useState<'auto' | 'template' | 'custom'>('auto');
    const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);

    const [customPaths, setCustomPaths] = React.useState({
        latPath: '',
        lonPath: '',
        tsPath: '',
        batteryPath: '',
        rssiPath: '',
        snrPath: '',
        tempPath: '',
        lightPath: '',
    });

    const [customFields, setCustomFields] = React.useState<{ key: string; path: string }[]>([]);

    const addCustomField = () => {
        setCustomFields([...customFields, { key: '', path: '' }]);
    };

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    const updateCustomField = (index: number, field: 'key' | 'path', value: string) => {
        const newFields = [...customFields];
        newFields[index] = { ...newFields[index], [field]: value };
        setCustomFields(newFields);
    };

    const [editName, setEditName] = React.useState(initialName || '');
    const [editGroup, setEditGroup] = React.useState('');
    const [editTags, setEditTags] = React.useState('');
    const [isUpdating, setIsUpdating] = React.useState(false);

    const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);
    const [templateName, setTemplateName] = React.useState('');

    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncProgress, setSyncProgress] = React.useState<{
        current: number;
        total: number;
    } | null>(null);
    const [showReprocessConfirm, setShowReprocessConfirm] = React.useState(false);

    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const readStream = async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const streamData = JSON.parse(line);
                    if (streamData.type === 'progress') {
                        setSyncProgress({ current: streamData.current, total: streamData.total });
                    } else if (streamData.type === 'complete') {
                        setSyncProgress(null);
                        setIsSyncing(false);
                        setShowReprocessConfirm(false);
                        mutate();
                    }
                } catch (streamErr) {
                    console.error('Failed to parse stream line', streamErr);
                }
            }
        }
    };

    React.useEffect(() => {
        if (mode !== 'custom') return;

        if (selectedTemplateId && data?.templates) {
            const template = data.templates.find((t: any) => t.id === selectedTemplateId);
            if (template) {
                setCustomPaths({
                    latPath: template.latPath || '',
                    lonPath: template.lonPath || '',
                    tsPath: template.tsPath || '',
                    batteryPath: template.batteryPath || '',
                    rssiPath: template.rssiPath || '',
                    snrPath: template.snrPath || '',
                    tempPath: template.tempPath || '',
                    lightPath: template.lightPath || '',
                });

                if (template.customFields && typeof template.customFields === 'object') {
                    setCustomFields(
                        Object.entries(template.customFields).map(([key, path]) => ({
                            key,
                            path: path as string,
                        })),
                    );
                } else {
                    setCustomFields([]);
                }
            }
            return;
        }

        if (data?.suggestedPaths) {
            setCustomPaths((prev) => ({ ...prev, ...data.suggestedPaths }));
        }
    }, [mode, selectedTemplateId, data?.templates, data?.suggestedPaths]);

    React.useEffect(() => {
        if (!data?.device) return;

        setEditName(data.device.name || '');
        setEditGroup(data.device.group || '');
        setEditTags(data.device.tags?.join(', ') || '');

        if (!data.device.mapperId && !data.device.mapper) {
            setMode('auto');
        } else if (data.device.mapper?.isTemplate === false) {
            setMode('custom');
            setCustomPaths({
                latPath: data.device.mapper.latPath || '',
                lonPath: data.device.mapper.lonPath || '',
                tsPath: data.device.mapper.tsPath || '',
                batteryPath: data.device.mapper.batteryPath || '',
                rssiPath: data.device.mapper.rssiPath || '',
                snrPath: data.device.mapper.snrPath || '',
                tempPath: data.device.mapper.tempPath || '',
                lightPath: data.device.mapper.lightPath || '',
            });

            if (
                data.device.mapper.customFields &&
                typeof data.device.mapper.customFields === 'object'
            ) {
                setCustomFields(
                    Object.entries(data.device.mapper.customFields).map(([key, path]) => ({
                        key,
                        path: path as string,
                    })),
                );
            } else {
                setCustomFields([]);
            }
        } else {
            setMode('template');
            setSelectedTemplateId(data.device.mapperId);
        }
    }, [data]);

    const handleUpdateGeneral = async () => {
        if (!onUpdate) return;
        setIsUpdating(true);
        try {
            const tagsArray = editTags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);
            await onUpdate(deviceId, { name: editName, group: editGroup, tags: tagsArray });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
            if (res.ok) {
                setOpen(false);
                window.location.reload();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReprocess = async () => {
        setIsSyncing(true);
        setSyncProgress({ current: 0, total: 100 });
        try {
            const res = await fetch(`/api/devices/${deviceId}/mapping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reprocess: true }),
            });
            await readStream(res);
        } catch {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    };

    const handleSaveMapping = async () => {
        const serializedCustomFields = customFields.reduce(
            (acc, curr) => {
                if (curr.key && curr.path) acc[curr.key] = curr.path;
                return acc;
            },
            {} as Record<string, string>,
        );

        const body =
            mode === 'auto'
                ? { mapperId: null }
                : mode === 'template'
                  ? { mapperId: selectedTemplateId }
                  : {
                        customMapper: { ...customPaths, customFields: serializedCustomFields },
                        saveAsTemplate: saveAsTemplate && templateName.trim() ? true : undefined,
                        templateName: saveAsTemplate ? templateName.trim() : undefined,
                    };

        const res = await fetch(`/api/devices/${deviceId}/mapping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            mutate();
            setOpen(false);
        }
    };

    const formatDisplay = (value: unknown, precision?: number) => {
        if (value === undefined || value === null) return 'N/A';
        if (value instanceof Date) return value.toLocaleString();
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'number' && precision !== undefined) return value.toFixed(precision);
        return String(value);
    };

    const testResults = React.useMemo(() => {
        if (!data?.latestEvent?.payload) return null;

        const getValue = (obj: any, path: string) => {
            if (!path || !obj || path === '$' || path === '$.') return undefined;
            let cleanPath = path.startsWith('$.') ? path.substring(2) : path;
            cleanPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');
            const parts = cleanPath.split('.').filter(Boolean);
            if (parts.length === 0) return undefined;
            return parts.reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
        };

        const paths =
            mode === 'template'
                ? data.templates.find((t: any) => t.id === selectedTemplateId) || {}
                : mode === 'custom'
                  ? customPaths
                  : {};

        // Process custom fields for preview
        const customResults: Record<string, any> = {};
        if (mode === 'custom') {
            customFields.forEach((field) => {
                if (field.key && field.path) {
                    customResults[field.key] = getValue(data.latestEvent.payload, field.path);
                }
            });
        } else if (paths.customFields) {
            Object.entries(paths.customFields).forEach(([key, path]) => {
                customResults[key] = getValue(data.latestEvent.payload, path as string);
            });
        }

        if (mode === 'auto') {
            // Auto mapping fallback preview logic
            const payload = data.latestEvent.payload;
            let decoded =
                payload.object ||
                payload.decoded?.payload ||
                payload.uplink_message?.decoded_payload ||
                {};
            if (Object.keys(decoded).length === 0 && (payload.lat || payload.latitude))
                decoded = payload;

            const timeStr =
                payload.time ||
                payload.received_at ||
                payload.reported_at ||
                payload.uplink_message?.received_at;

            return {
                lat:
                    decoded.latitude ||
                    decoded.lat ||
                    decoded.Latitude ||
                    decoded.Location?.lat ||
                    payload.uplink_message?.locations?.['user']?.latitude,
                lon:
                    decoded.longitude ||
                    decoded.lon ||
                    decoded.Longitude ||
                    decoded.Location?.lon ||
                    payload.uplink_message?.locations?.['user']?.longitude,
                ts: smartParseDate(timeStr || new Date().toISOString()),
                battery: decoded.battery || decoded.bat || decoded.batteryLevel,
                rssi: payload.rxInfo?.[0]?.rssi || payload.uplink_message?.rx_metadata?.[0]?.rssi,
                light: decoded.light || decoded.lux,
                custom: {},
            };
        }

        return {
            lat: getValue(data.latestEvent.payload, paths.latPath),
            lon: getValue(data.latestEvent.payload, paths.lonPath),
            ts: smartParseDate(getValue(data.latestEvent.payload, paths.tsPath)),
            battery: getValue(data.latestEvent.payload, paths.batteryPath),
            rssi: getValue(data.latestEvent.payload, paths.rssiPath),
            light: getValue(data.latestEvent.payload, paths.lightPath),
            custom: customResults,
        };
    }, [data, mode, selectedTemplateId, customPaths, customFields]);

    const latestTimestamp = data?.latestEvent?.createdAt
        ? new Date(data.latestEvent.createdAt).toLocaleString()
        : null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Open settings for ${initialName || deviceId}`}
                    className="h-8 w-8 rounded-md border border-border/30 bg-background/60 text-muted-foreground shadow-sm backdrop-blur-xl hover:bg-background/90 hover:text-foreground"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-none w-full h-[100dvh] sm:max-w-[1040px] sm:h-[720px] flex flex-col p-0 overflow-hidden sm:rounded-xl border-0 sm:border sm:border-border/40 bg-background/90 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row h-full min-h-0">
                    <aside className="w-full sm:w-64 shrink-0 border-b sm:border-r border-border/40 bg-gradient-to-b from-background/95 to-muted/25 p-4 flex flex-col gap-4">
                        <div className="space-y-1">
                            <DialogTitle className="text-base font-semibold tracking-tight truncate">
                                {editName || deviceId.slice(0, 8)}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Type: {data?.device?.type || 'IoT node'}
                            </DialogDescription>
                        </div>

                        <nav className="grid grid-cols-2 gap-2 sm:block sm:space-y-1.5">
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className={cn(
                                    'w-full flex items-center justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 py-2 text-sm transition-colors',
                                    activeTab === 'general'
                                        ? 'border-border/60 bg-background/80 text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                                )}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">General settings</span>
                                <span className="sm:hidden">General</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('mapping')}
                                className={cn(
                                    'w-full flex items-center justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 py-2 text-sm transition-colors',
                                    activeTab === 'mapping'
                                        ? 'border-border/60 bg-background/80 text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                                )}
                            >
                                <Terminal className="h-4 w-4" />
                                <span className="hidden sm:inline">Payload mapping</span>
                                <span className="sm:hidden">Mapping</span>
                            </button>
                        </nav>

                        <div className="mt-auto rounded-md border border-border/40 bg-background/75 p-3 space-y-2 hidden sm:block shadow-sm">
                            <h4 className="text-xs font-medium text-muted-foreground">
                                Latest telemetry
                            </h4>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">RSSI</span>
                                <span className="font-mono">{data?.device?.lastRssi ?? '--'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Battery</span>
                                <span className="font-mono">
                                    {data?.device?.lastBattery !== null &&
                                    data?.device?.lastBattery !== undefined
                                        ? `${data.device.lastBattery}%`
                                        : '--'}
                                </span>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0 overflow-hidden bg-background/50">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="h-full flex items-center justify-center p-8 text-sm text-destructive">
                                Failed to load device settings.
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto p-5 pb-24 sm:p-6 sm:pb-6">
                                <Tabs value={activeTab} className="min-h-full">
                                    <TabsContent value="general" className="mt-0 space-y-6">
                                        <header className="space-y-1">
                                            <h2 className="text-lg font-semibold tracking-tight">
                                                General Settings
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                Manage device identity, organization, and lifecycle.
                                            </p>
                                        </header>

                                        <div className="space-y-5">
                                            <section className="space-y-4 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-medium">
                                                        Device Identity
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Update how this device is identified and
                                                        grouped across the system.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Display name
                                                        </Label>
                                                        <Input
                                                            value={editName}
                                                            onChange={(event) =>
                                                                setEditName(event.target.value)
                                                            }
                                                            className="h-9 border-border/40 bg-background/80"
                                                            placeholder="For example: Asset 04"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Group
                                                        </Label>
                                                        <Input
                                                            value={editGroup}
                                                            onChange={(event) =>
                                                                setEditGroup(event.target.value)
                                                            }
                                                            className="h-9 border-border/40 bg-background/80"
                                                            placeholder="For example: Logistics south"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">
                                                        Tags
                                                    </Label>
                                                    <Input
                                                        value={editTags}
                                                        onChange={(event) =>
                                                            setEditTags(event.target.value)
                                                        }
                                                        className="h-9 font-mono text-xs border-border/40 bg-background/80"
                                                        placeholder="sensor, priority, active"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Separate multiple tags with commas.
                                                    </p>
                                                </div>

                                                <div className="pt-2">
                                                    <Button
                                                        onClick={handleUpdateGeneral}
                                                        disabled={isUpdating}
                                                        className="h-9 px-4 text-sm shadow-sm"
                                                    >
                                                        {isUpdating ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="mr-2 h-4 w-4" />
                                                        )}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </section>

                                            <section className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/[0.04] p-4 shadow-sm">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-medium text-destructive">
                                                        Danger Zone
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Critical actions that affect data integrity.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="rounded-md border border-border/40 bg-background/70 p-4 space-y-3">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">
                                                                Reprocess History
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Re-run the current payload mapper
                                                                against all historical events for
                                                                this device.
                                                            </p>
                                                        </div>

                                                        {isSyncing ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-muted-foreground">
                                                                        Processing...
                                                                    </span>
                                                                    <span className="font-mono">
                                                                        {syncProgress
                                                                            ? `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`
                                                                            : '0%'}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full rounded-full bg-muted/50">
                                                                    <div
                                                                        className="h-full rounded-full bg-primary"
                                                                        style={{
                                                                            width: `${syncProgress ? (syncProgress.current / syncProgress.total) * 100 : 0}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : showReprocessConfirm ? (
                                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={handleReprocess}
                                                                    className="h-8 text-xs shadow-sm"
                                                                >
                                                                    Confirm
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        setShowReprocessConfirm(
                                                                            false,
                                                                        )
                                                                    }
                                                                    className="h-8 text-xs"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setShowReprocessConfirm(true)
                                                                }
                                                                className="h-8 text-xs border-border/50 bg-background/80"
                                                            >
                                                                Reprocess Data
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium text-destructive">
                                                                Delete Device
                                                            </p>
                                                            <p className="text-xs text-destructive/80">
                                                                Permanently remove this device and
                                                                all its history. This cannot be
                                                                undone.
                                                            </p>
                                                        </div>

                                                        {showDeleteConfirm ? (
                                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={handleDelete}
                                                                    disabled={isDeleting}
                                                                    className="h-8 text-xs"
                                                                >
                                                                    {isDeleting ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        'Confirm Deletion'
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        setShowDeleteConfirm(false)
                                                                    }
                                                                    className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                onClick={() =>
                                                                    setShowDeleteConfirm(true)
                                                                }
                                                                    className="h-8 text-xs text-destructive border-destructive/30 bg-background/70 hover:bg-destructive/10"
                                                                >
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                Delete Device
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="mapping" className="mt-0 space-y-5">
                                        <header className="space-y-1">
                                            <h2 className="text-lg font-semibold tracking-tight">
                                                Payload Mapping
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                Define mapping rules and validate against the latest
                                                payload.
                                            </p>
                                        </header>

                                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                                            <section className="space-y-4 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                                                <div className="inline-flex h-9 items-center rounded-md border border-border/40 bg-background/70 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMode('auto')}
                                                        className={cn(
                                                            'inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors',
                                                            mode === 'auto'
                                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                                        )}
                                                    >
                                                        <Activity className="h-3.5 w-3.5" />
                                                        Auto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMode('template')}
                                                        className={cn(
                                                            'inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors',
                                                            mode === 'template'
                                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                                        )}
                                                    >
                                                        <LayoutGrid className="h-3.5 w-3.5" />
                                                        Template
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMode('custom')}
                                                        className={cn(
                                                            'inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors',
                                                            mode === 'custom'
                                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                                        )}
                                                    >
                                                        <Terminal className="h-3.5 w-3.5" />
                                                        Custom
                                                    </button>
                                                </div>

                                                {mode === 'template' && (
                                                    <div className="space-y-2">
                                                        {data?.templates?.length ? (
                                                            data.templates.map((template: any) => (
                                                                <button
                                                                    key={template.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedTemplateId(
                                                                            template.id,
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                                                                        selectedTemplateId ===
                                                                            template.id
                                                                            ? 'border-primary/30 bg-primary/10 text-foreground'
                                                                            : 'border-border/40 bg-background/70 hover:bg-muted/30',
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-sm font-medium">
                                                                                {template.name}
                                                                            </p>
                                                                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                                                {template.latPath} |{' '}
                                                                                {template.lonPath}
                                                                            </p>
                                                                        </div>
                                                                        {selectedTemplateId ===
                                                                            template.id && (
                                                                            <Check className="h-4 w-4 text-primary" />
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="rounded-md border border-dashed border-border/50 bg-background/60 p-6 text-center text-sm text-muted-foreground">
                                                                No templates available.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {mode === 'custom' && (
                                                    <div className="rounded-md border border-border/40 bg-background/80 p-4 space-y-4">
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            <div className="space-y-1.5 md:col-span-2">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Timestamp path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.tsPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            tsPath: e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.time"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Latitude path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.latPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            latPath: e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.latitude"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Longitude path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.lonPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            lonPath: e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.longitude"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Battery path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.batteryPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            batteryPath:
                                                                                e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.battery"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Temperature path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.tempPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            tempPath:
                                                                                e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.temperature"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    Light path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.lightPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            lightPath:
                                                                                e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.light"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    RSSI path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.rssiPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            rssiPath:
                                                                                e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.rssi"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    SNR path
                                                                </Label>
                                                                <Input
                                                                    value={customPaths.snrPath}
                                                                    onChange={(e) =>
                                                                        setCustomPaths({
                                                                            ...customPaths,
                                                                            snrPath: e.target.value,
                                                                        })
                                                                    }
                                                                    className="h-9 rounded-md border-border/40 bg-background/80 font-mono text-xs"
                                                                    placeholder="$.snr"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-xs font-medium">
                                                                    Extra fields
                                                                </h4>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={addCustomField}
                                                                    className="h-7 rounded-md border-border/50 bg-background/80 px-2 text-xs"
                                                                >
                                                                    <Plus className="mr-1 h-3 w-3" />
                                                                    Add
                                                                </Button>
                                                            </div>
                                                            {customFields.length === 0 && (
                                                                <div className="rounded-md border border-dashed border-border/50 bg-background/70 py-3 text-center text-[11px] text-muted-foreground">
                                                                    No extra fields defined
                                                                </div>
                                                            )}
                                                            <div className="space-y-2">
                                                                {customFields.map(
                                                                    (field, index) => (
                                                                        <div
                                                                            key={index}
                                                                            className="grid grid-cols-[96px_1fr_auto] items-center gap-2"
                                                                        >
                                                                            <Input
                                                                                value={field.key}
                                                                                onChange={(e) =>
                                                                                    updateCustomField(
                                                                                        index,
                                                                                        'key',
                                                                                        e.target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-8 rounded-md border-border/40 bg-background/80 font-mono text-[11px]"
                                                                                placeholder="key"
                                                                            />
                                                                            <Input
                                                                                value={field.path}
                                                                                onChange={(e) =>
                                                                                    updateCustomField(
                                                                                        index,
                                                                                        'path',
                                                                                        e.target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                className="h-8 rounded-md border-border/40 bg-background/80 font-mono text-[11px]"
                                                                                placeholder="$.path"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() =>
                                                                                    removeCustomField(
                                                                                        index,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                                aria-label={`Remove custom field ${index + 1}`}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 pt-1">
                                                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                                                                    checked={saveAsTemplate}
                                                                    onChange={(e) =>
                                                                        setSaveAsTemplate(
                                                                            e.target.checked,
                                                                        )
                                                                    }
                                                                />
                                                                Save as reusable template
                                                            </label>
                                                            {saveAsTemplate && (
                                                                <Input
                                                                    value={templateName}
                                                                    onChange={(e) =>
                                                                        setTemplateName(
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    className="h-8 flex-1 rounded-md border-border/40 bg-background/80 text-xs"
                                                                    placeholder="Template name"
                                                                    autoFocus
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-end pt-1">
                                                    <Button
                                                        onClick={handleSaveMapping}
                                                        disabled={
                                                            mode === 'template' &&
                                                            !selectedTemplateId
                                                        }
                                                        className="h-9 px-4 text-sm shadow-sm"
                                                    >
                                                        <Save className="mr-2 h-4 w-4" />
                                                        Save mapping
                                                    </Button>
                                                </div>
                                            </section>

                                            <aside className="xl:sticky xl:top-0 xl:self-start">
                                                <div className="rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                                                    <h3 className="text-sm font-semibold">
                                                        Live preview
                                                    </h3>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Based on the latest payload and current
                                                        mapping mode.
                                                    </p>

                                                    <div className="mt-3 space-y-2 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                Coordinates
                                                            </span>
                                                            <span className="font-mono">
                                                                {formatDisplay(testResults?.lat, 4)}
                                                                ,{' '}
                                                                {formatDisplay(testResults?.lon, 4)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                Timestamp
                                                            </span>
                                                            <span className="max-w-[180px] truncate font-mono">
                                                                {formatDisplay(testResults?.ts)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Battery className="h-3.5 w-3.5" />
                                                                Battery
                                                            </span>
                                                            <span className="font-mono">
                                                                {testResults?.battery ===
                                                                    undefined ||
                                                                testResults?.battery === null
                                                                    ? 'N/A'
                                                                    : `${formatDisplay(testResults.battery)}%`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Signal className="h-3.5 w-3.5" />
                                                                RSSI
                                                            </span>
                                                            <span className="font-mono">
                                                                {formatDisplay(testResults?.rssi)}
                                                            </span>
                                                        </div>
                                                        {testResults?.light !== undefined && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                    <Activity className="h-3.5 w-3.5" />
                                                                    Light
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatDisplay(
                                                                        testResults?.light,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {testResults?.custom &&
                                                        Object.keys(testResults.custom).length >
                                                            0 && (
                                                            <div className="mt-3 border-t border-border/40 pt-3">
                                                                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                                                                    Custom fields
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {Object.entries(
                                                                        testResults.custom,
                                                                    ).map(([key, val]) => (
                                                                        <div
                                                                            key={key}
                                                                            className="flex items-center justify-between gap-2 text-xs"
                                                                        >
                                                                            <span className="truncate text-muted-foreground">
                                                                                {key}
                                                                            </span>
                                                                            <span className="max-w-[170px] truncate font-mono">
                                                                                {formatDisplay(val)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                </div>
                                            </aside>
                                        </div>

                                        <section className="rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold">Latest payload</h3>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {latestTimestamp
                                                        ? `Received ${latestTimestamp}`
                                                        : 'No payload'}
                                                </span>
                                            </div>
                                            <div className="mt-3 h-[240px] overflow-auto rounded-md border border-border/40 bg-background/70 p-2">
                                                {data?.latestEvent ? (
                                                    <pre className="text-[10px] font-mono leading-relaxed text-muted-foreground sm:text-xs">
                                                        {JSON.stringify(
                                                            data.latestEvent.payload,
                                                            null,
                                                            2,
                                                        )}
                                                    </pre>
                                                ) : (
                                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
                                                        <Activity className="h-5 w-5 opacity-50" />
                                                        <span className="text-xs">Waiting for data...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
