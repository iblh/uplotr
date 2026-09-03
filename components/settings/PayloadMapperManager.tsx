"use client";

import * as React from 'react';
import useSWR from 'swr';
import { Plus, Trash2, MapPin, Battery, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PayloadMapper } from '@prisma/client';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PayloadMapperManager() {
    const { data: mappers, mutate } = useSWR<PayloadMapper[]>('/api/mappers', fetcher);
    const [isAdding, setIsAdding] = React.useState(false);

    const [formData, setFormData] = React.useState({
        name: '',
        targetType: '',
        latPath: '$.object.latitude',
        lonPath: '$.object.longitude',
        tsPath: '$.time',
        batteryPath: '',
        tempPath: '',
        lightPath: '',
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/mappers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            mutate();
            setIsAdding(false);
            setFormData({
                name: '',
                targetType: '',
                latPath: '$.object.latitude',
                lonPath: '$.object.longitude',
                tsPath: '$.time',
                batteryPath: '',
                tempPath: '',
                lightPath: '',
            });
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/mappers?id=${id}`, { method: 'DELETE' });
        if (res.ok) mutate();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">Global mapping rules</h3>
                <Button
                    size="sm"
                    onClick={() => setIsAdding(!isAdding)}
                    className="h-8 rounded-md px-3 text-xs shadow-sm"
                >
                    {isAdding ? (
                        'Cancel'
                    ) : (
                        <>
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add mapper
                        </>
                    )}
                </Button>
            </div>

            {isAdding && (
                <form
                    onSubmit={handleAdd}
                    className="space-y-5 rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl"
                >
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Identity
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Mapper name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Helium generic"
                                    className="h-9 border-border/40 bg-background/80 font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Target type (optional)
                                </Label>
                                <Input
                                    value={formData.targetType}
                                    onChange={(e) =>
                                        setFormData({ ...formData, targetType: e.target.value })
                                    }
                                    placeholder="e.g. lorawan"
                                    className="h-9 border-border/40 bg-background/80 font-mono text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Data points
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 opacity-60" /> Latitude path
                                </Label>
                                <Input
                                    value={formData.latPath}
                                    onChange={(e) => setFormData({ ...formData, latPath: e.target.value })}
                                    placeholder="$.object.lat"
                                    className="h-9 border-border/40 bg-background/80 font-mono text-xs"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 opacity-60" /> Longitude path
                                </Label>
                                <Input
                                    value={formData.lonPath}
                                    onChange={(e) => setFormData({ ...formData, lonPath: e.target.value })}
                                    placeholder="$.object.lon"
                                    className="h-9 border-border/40 bg-background/80 font-mono text-xs"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 opacity-60" /> Timestamp path
                                </Label>
                                <Input
                                    value={formData.tsPath}
                                    onChange={(e) => setFormData({ ...formData, tsPath: e.target.value })}
                                    placeholder="$.time"
                                    className="h-9 border-border/40 bg-background/80 font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Battery className="h-3 w-3 opacity-60" /> Battery path
                                </Label>
                                <Input
                                    value={formData.batteryPath}
                                    onChange={(e) =>
                                        setFormData({ ...formData, batteryPath: e.target.value })
                                    }
                                    placeholder="$.object.battery"
                                    className="h-9 border-border/40 bg-background/80 font-mono text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAdding(false)}
                            className="h-8 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="h-8 px-4 text-xs shadow-sm">
                            Save mapper
                        </Button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {mappers?.map((mapper) => (
                    <div
                        key={mapper.id}
                        className="group flex items-center justify-between rounded-md border border-border/40 bg-background/75 p-3 shadow-sm"
                    >
                        <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium tracking-tight">
                                    {mapper.name}
                                </span>
                                {mapper.targetType && (
                                    <span className="rounded-sm border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                                        {mapper.targetType}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-mono">
                                    <MapPin className="h-3 w-3 opacity-50" />
                                    {mapper.latPath} / {mapper.lonPath}
                                </span>
                                {mapper.tsPath && (
                                    <span className="flex items-center gap-1.5 font-mono">
                                        <Clock className="h-3 w-3 opacity-50" />
                                        {mapper.tsPath}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(mapper.id)}
                            aria-label={`Delete mapper ${mapper.name}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                {mappers?.length === 0 && !isAdding && (
                    <div className="rounded-lg border border-dashed border-border/50 bg-background/70 py-10 text-center">
                        <Database className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
                        <p className="text-sm font-medium">No custom mappers</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            uplotr uses system default fields.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
