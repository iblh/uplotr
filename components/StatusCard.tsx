"use client";

import * as React from 'react';

type Health = { status: 'healthy' | 'unhealthy'; database: 'connected' | 'unavailable'; version: string };

export function StatusCard() {
  const [health, setHealth] = React.useState<Health | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch('/api/health', { cache: 'no-store' })
      .then(async (response) => ({ ...(await response.json()), status: response.ok ? 'healthy' : 'unhealthy' }) as Health)
      .then((result) => { if (active) setHealth(result); })
      .catch(() => { if (active) setHealth({ status: 'unhealthy', database: 'unavailable', version: 'unknown' }); });
    return () => { active = false; };
  }, []);

  const healthy = health?.status === 'healthy';
  return (
    <div aria-live="polite" className="mt-5 rounded-lg border bg-muted/25 p-4">
      <div className="flex items-center gap-2 font-medium">
        <span className={`h-2.5 w-2.5 rounded-full ${health === null ? 'bg-amber-400' : healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {health === null ? 'Checking current health…' : healthy ? 'All systems operational' : 'Database connectivity problem'}
      </div>
      {health ? <p className="mt-2 text-sm text-muted-foreground">Database: {health.database} · Version: {health.version}</p> : null}
    </div>
  );
}
