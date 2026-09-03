"use client";

import * as React from 'react';
import useSWR from 'swr';
import { Plus, Trash2, Key, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

interface ApiKey {
    id: string;
    name: string;
    prefix: string | null;
    lastUsedAt: string | null;
    createdAt: string;
}

export function ApiKeyManager() {
    const { data: keys, error, mutate } = useSWR<ApiKey[]>('/api/keys', fetcher);
    const [newKeyName, setNewKeyName] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
    const [createdKey, setCreatedKey] = React.useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });

            if (res.ok) {
                const payload = await res.json();
                setCreatedKey(payload.key);
                setNewKeyName('');
                setIsDialogOpen(false);
                mutate();
            }
        } catch (error) {
            console.error('Failed to create key', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key? Integrations using it will fail.')) {
            return;
        }

        try {
            await fetch(`/api/keys/${id}`, { method: 'DELETE' });
            mutate();
        } catch (error) {
            console.error('Failed to delete key', error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(text);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    if (error) {
        return <div className="text-sm text-destructive">Failed to load API keys.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-base font-medium">API keys</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage keys for external ingestion services.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 gap-1 shadow-sm">
                            <Plus className="h-3.5 w-3.5" />
                            Create key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-border/40 bg-background/90 backdrop-blur-xl sm:rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Create API key</DialogTitle>
                            <DialogDescription>
                                Enter a label to identify which integration uses this key.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="mt-2 space-y-4">
                            <Input
                                placeholder="e.g. Helium Integration"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                disabled={isCreating}
                                className="border-border/40 bg-background/80"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="border-border/50 bg-background/80"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating || !newKeyName.trim()}>
                                    {isCreating ? 'Creating...' : 'Create key'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {createdKey ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4" role="status">
                    <p className="text-sm font-semibold">Copy this key now</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        For security, the full value will not be shown again.
                    </p>
                    <button
                        type="button"
                        className="mt-3 flex max-w-full items-center gap-2 rounded-md bg-background/80 px-3 py-2 text-left"
                        onClick={() => copyToClipboard(createdKey)}
                    >
                        <code className="break-all font-mono text-xs">{createdKey}</code>
                        {copiedKey === createdKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setCreatedKey(null)}>
                        I have saved it
                    </Button>
                </div>
            ) : null}

            <div className="rounded-lg border border-border/40 bg-background/75 shadow-sm backdrop-blur-xl">
                {!keys ? (
                    <div className="space-y-3 p-4">
                        <div className="h-10 w-full animate-pulse rounded-md bg-muted/30" />
                        <div className="h-10 w-full animate-pulse rounded-md bg-muted/30" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Key className="mb-2 h-8 w-8 text-muted-foreground/35" />
                        <p className="text-sm font-medium">No API keys found</p>
                        <p className="max-w-[220px] text-xs text-muted-foreground">
                            Create a key to start ingesting data from external sources.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {keys.map((key) => (
                            <div
                                key={key.id}
                                className="flex items-center justify-between p-3 transition-colors hover:bg-background/80 sm:p-4"
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium">{key.name}</p>
                                        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(key.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                    <code className="rounded bg-muted/60 px-[0.35rem] py-[0.2rem] font-mono text-[11px] leading-none text-muted-foreground">
                                        {key.prefix || 'Legacy key — use it once to migrate'}
                                    </code>
                                    <p className="text-[10px] text-muted-foreground">
                                        {key.lastUsedAt ? `Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}` : 'Never used'}
                                    </p>
                                </div>

                                <div className="pl-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleDelete(key.id)}
                                        aria-label={`Delete API key ${key.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
