"use client";

import * as React from 'react';
import useSWR from 'swr';
import { User, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

interface UserType {
    id: string;
    username: string;
    role: string;
    createdAt: string;
}

export function UserManager() {
    const { data: users, error } = useSWR<UserType[]>('/api/users', fetcher);

    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Failed to load users.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    User management is currently read-only.
                </p>
            </div>

            <div className="rounded-lg border border-border/40 bg-background/75 p-4 shadow-sm backdrop-blur-xl">
                <h3 className="text-sm font-semibold tracking-tight">All users</h3>

                {!users ? (
                    <div className="mt-3 space-y-2">
                        <div className="h-12 animate-pulse rounded-md bg-muted/30" />
                        <div className="h-12 animate-pulse rounded-md bg-muted/30" />
                    </div>
                ) : !Array.isArray(users) || users.length === 0 ? (
                    <div className="mt-3 rounded-md border border-dashed border-border/50 bg-background/70 p-5 text-center text-xs text-muted-foreground">
                        No users found.
                    </div>
                ) : (
                    <div className="mt-3 space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 rounded-md border border-border/40 bg-background/70 p-3"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium">{user.username}</span>
                                        <span
                                            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                user.role === 'admin'
                                                    ? 'bg-primary/15 text-primary'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {user.role}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        Joined{' '}
                                        {formatDistanceToNow(new Date(user.createdAt), {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
