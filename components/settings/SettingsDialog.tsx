'use client';

import * as React from 'react';
import {
    Settings,
    ShieldCheck,
    Database,
    UserCog,
    Info,
    Map,
    ChevronDown,
    HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyManager } from './ApiKeyManager';
import { AuthModeManager } from './AuthModeManager';
import { UserManager } from './UserManager';
import { PayloadMapperManager } from './PayloadMapperManager';
import { DataRetentionManager } from './DataRetentionManager';
import { MapProviderManager } from './MapProviderManager';
import { cn } from '@/lib/utils';

export function SettingsDialog() {
    const [open, setOpen] = React.useState(false);
    const [securityGuideOpen, setSecurityGuideOpen] = React.useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open system settings"
                    className="h-9 w-9 rounded-md border border-border/30 bg-background/60 text-muted-foreground shadow-sm backdrop-blur-xl hover:bg-background/90 hover:text-foreground"
                >
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-none w-full h-[100dvh] sm:max-w-[1020px] sm:h-[700px] overflow-hidden flex flex-col p-0 sm:rounded-xl border-0 sm:border sm:border-border/40 bg-background/90 backdrop-blur-xl shadow-2xl">
                <Tabs defaultValue="api-keys" className="flex flex-col sm:flex-row h-full min-h-0">
                    <aside className="w-full sm:w-64 shrink-0 border-b sm:border-r border-border/40 bg-gradient-to-b from-background/95 to-muted/25 p-4 flex flex-col gap-4">
                        <div className="space-y-1 px-1 hidden sm:block">
                            <DialogTitle className="text-base font-semibold tracking-tight">
                                System settings
                            </DialogTitle>
                        </div>

                        <TabsList className="flex h-auto flex-row sm:flex-col items-stretch gap-1.5 bg-transparent p-0 overflow-x-auto sm:overflow-visible no-scrollbar">
                            <TabsTrigger
                                value="api-keys"
                                className="h-9 w-full justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground data-[state=active]:border-border/60 data-[state=active]:bg-background/85 data-[state=active]:text-foreground whitespace-nowrap"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                <span className="hidden sm:inline">Access and security</span>
                                <span className="sm:hidden">Security</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="mappers"
                                className="h-9 w-full justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground data-[state=active]:border-border/60 data-[state=active]:bg-background/85 data-[state=active]:text-foreground whitespace-nowrap"
                            >
                                <Database className="h-4 w-4" />
                                <span className="hidden sm:inline">Payload mapping</span>
                                <span className="sm:hidden">Mapping</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="map"
                                className="h-9 w-full justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground data-[state=active]:border-border/60 data-[state=active]:bg-background/85 data-[state=active]:text-foreground whitespace-nowrap"
                            >
                                <Map className="h-4 w-4" />
                                <span className="hidden sm:inline">Map rendering</span>
                                <span className="sm:hidden">Map</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="users"
                                className="h-9 w-full justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground data-[state=active]:border-border/60 data-[state=active]:bg-background/85 data-[state=active]:text-foreground whitespace-nowrap"
                            >
                                <UserCog className="h-4 w-4" />
                                <span className="hidden sm:inline">User accounts</span>
                                <span className="sm:hidden">Users</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="health"
                                className="h-9 w-full justify-center sm:justify-start gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground data-[state=active]:border-border/60 data-[state=active]:bg-background/85 data-[state=active]:text-foreground whitespace-nowrap"
                            >
                                <HardDrive className="h-4 w-4" />
                                <span className="hidden sm:inline">Database health</span>
                                <span className="sm:hidden">Health</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-auto rounded-md border border-border/40 bg-background/75 px-3 py-2 hidden sm:block shadow-sm">
                            <p className="text-xs text-muted-foreground">Instance version 0.1.0</p>
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0 overflow-y-auto bg-background/50 p-6 sm:p-7">
                        <TabsContent value="api-keys" className="mt-0 space-y-6">
                            <header className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    Access and Security
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Configure how external devices authenticate with this instance.
                                </p>
                            </header>

                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <AuthModeManager />
                                </section>

                                <section className="rounded-lg border border-border/40 bg-background/75 shadow-sm backdrop-blur-xl">
                                    <button
                                        type="button"
                                        onClick={() => setSecurityGuideOpen((prev) => !prev)}
                                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                            <Info className="h-4 w-4 text-primary" />
                                            Webhook security guide
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                'h-4 w-4 text-muted-foreground transition-transform',
                                                securityGuideOpen && 'rotate-180',
                                            )}
                                        />
                                    </button>

                                    {securityGuideOpen && (
                                        <div className="space-y-4 border-t border-border/40 px-4 pb-4 pt-3">
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-md border border-border/40 bg-background/70 px-3 py-2.5">
                                                    <p className="text-xs font-semibold">Off</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        No verification. Use only in temporary local
                                                        testing.
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-border/40 bg-background/70 px-3 py-2.5">
                                                    <p className="text-xs font-semibold">
                                                        Optional
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Accepts missing keys, but rejects invalid
                                                        ones.
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-border/40 bg-background/70 px-3 py-2.5">
                                                    <p className="text-xs font-semibold">
                                                        Required
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Rejects any request without a valid{' '}
                                                        <code>x-uplotr-key</code>.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-md border border-border/40 bg-background/70 p-3">
                                                <h3 className="text-xs font-semibold tracking-tight">
                                                    Best practices
                                                </h3>
                                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                                    <li>
                                                        Use distinct keys for different providers
                                                        (TTN, Helium, etc).
                                                    </li>
                                                    <li>Rotate keys periodically.</li>
                                                    <li>Delete unused keys immediately.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <div className="h-px bg-border" />

                                <section className="space-y-4">
                                    <ApiKeyManager />
                                </section>
                            </div>
                        </TabsContent>

                        <TabsContent value="mappers" className="mt-0 space-y-6">
                            <header className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    Payload mapping
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Define default JSON paths used to extract location and telemetry
                                    fields.
                                </p>
                            </header>
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <PayloadMapperManager />
                                </section>
                            </div>
                        </TabsContent>

                        <TabsContent value="users" className="mt-0 space-y-6">
                            <header className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    User accounts
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Review which users currently have access to this instance.
                                </p>
                            </header>
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <UserManager />
                                </section>
                            </div>
                        </TabsContent>

                        <TabsContent value="map" className="mt-0 space-y-6">
                            <header className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    Map rendering
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Select which map stack the dashboard should use.
                                </p>
                            </header>
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <MapProviderManager />
                                </section>
                            </div>
                        </TabsContent>

                        <TabsContent value="health" className="mt-0 space-y-6">
                            <header className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    Database health
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Manage data retention policies and database limits.
                                </p>
                            </header>
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <DataRetentionManager />
                                </section>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
