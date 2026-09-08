'use client';

import * as React from 'react';
import useSWR from 'swr';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Loader2,
  MapPinned,
  Plane,
  Play,
  Radio,
  Route,
  Square,
  Timer,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RunAnalysis } from '@/lib/run-analysis';
import { cn } from '@/lib/utils';

const fetcher = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return response.json();
};

interface RunSummary {
  id: string;
  deviceId: string;
  name: string;
  notes: string | null;
  hardwareVersion: string | null;
  firmwareVersion: string | null;
  activityType: 'GROUND' | 'FLIGHT';
  sourceFormat: string | null;
  expectedIntervalSeconds: number | null;
  minSamples: number;
  status: 'ACTIVE' | 'COMPLETED';
  startedAt: string;
  endedAt: string | null;
  _count: { positions: number };
}

interface RunReportResponse {
  run: RunSummary & { device: { id: string; name: string | null; externalId: string | null } };
  analysis: RunAnalysis;
}

interface ComparisonResponse {
  left: RunReportResponse;
  right: RunReportResponse;
  delta: {
    sampleDelta: number;
    distanceDeltaKm: number;
    durationDeltaMinutes: number;
    averageSpeedDeltaKph: number;
    qualityScoreDelta: number;
    batteryUsedDelta: number | null;
  };
  compatibility: {
    status: 'COMPARABLE' | 'PARTIAL' | 'INVALID';
    score: number;
    reasons: string[];
  };
}

interface FieldTestManagerProps {
  deviceId: string | null;
  canManage: boolean;
  activeViewRunId?: string | null;
  onViewRun?: (run: { id: string; name: string }) => void;
}

const number = (value: number, digits = 1) => value.toFixed(digits);

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      'rounded-md border px-2 py-1 text-xs font-semibold',
      score >= 90 && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      score >= 70 && score < 90 && 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      score < 70 && 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
    )}>
      Quality {score}
    </span>
  );
}

function AnalysisCards({ analysis }: { analysis: RunAnalysis }) {
  const cards = [
    { label: 'Distance', value: `${number(analysis.distanceKm)} km`, icon: Route },
    { label: 'Duration', value: `${number(analysis.durationMinutes, 0)} min`, icon: Timer },
    { label: 'Average speed', value: `${number(analysis.averageSpeedKph)} km/h`, icon: Gauge },
    { label: 'Battery used', value: analysis.batteryUsed === null ? '—' : `${analysis.batteryUsed} pts`, icon: Battery },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />{label}
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight">{value}</div>
        </div>
      ))}
    </div>
  );
}

function RunReport({ data, onViewRun }: { data: RunReportResponse; onViewRun?: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/15 p-4">
        <div>
          <p className="font-semibold">{data.run.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {format(new Date(data.run.startedAt), 'MMM d, yyyy · HH:mm')} · {data.analysis.samples} {data.analysis.samples === 1 ? 'sample' : 'samples'}
          </p>
          {(data.run.hardwareVersion || data.run.firmwareVersion) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {[data.run.hardwareVersion && `HW ${data.run.hardwareVersion}`, data.run.firmwareVersion && `FW ${data.run.firmwareVersion}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <ScoreBadge score={data.analysis.qualityScore} />
      </div>

      <AnalysisCards analysis={data.analysis} />

      {data.analysis.flight && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Flight summary</h3>
            {data.run.sourceFormat && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{data.run.sourceFormat}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Max altitude', data.analysis.flight.maxAltitudeM === null ? '—' : `${number(data.analysis.flight.maxAltitudeM)} m`],
              ['Altitude gain', `${number(data.analysis.flight.altitudeGainM)} m`],
              ['Max ground speed', `${number(data.analysis.flight.maxGroundSpeedKph)} km/h`],
              ['Max vertical speed', `${number(data.analysis.flight.maxVerticalSpeedMps)} m/s`],
              ['Max from home', `${number(data.analysis.flight.maxDistanceFromHomeKm, 2)} km`],
              ['Minimum satellites', data.analysis.flight.minGpsSatellites === null ? '—' : `${number(data.analysis.flight.minGpsSatellites, 0)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1.5 font-mono text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold">Data quality</h3>
        <div className="mt-2 space-y-2">
          {data.analysis.diagnostics.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />No reporting gaps, timestamp issues, or suspicious jumps detected.
            </div>
          ) : data.analysis.diagnostics.map((diagnostic) => (
            <div key={diagnostic.code} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{diagnostic.message}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Custom telemetry</h3>
          <span className="text-xs text-muted-foreground">min / avg / max / latest</span>
        </div>
        {data.analysis.metrics.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Add primitive fields or a <code className="font-mono">metrics</code> object to your payload to analyze custom telemetry.
          </p>
        ) : (
          <div className="mt-2 divide-y overflow-hidden rounded-lg border border-border/50">
            {data.analysis.metrics.map((metric) => (
              <div key={metric.key} className="grid grid-cols-[minmax(100px,1fr)_repeat(4,minmax(52px,.55fr))] gap-2 px-3 py-2 text-xs">
                <span className="truncate font-mono font-medium">{metric.key}</span>
                <span>{number(metric.min, 2)}</span>
                <span>{number(metric.average, 2)}</span>
                <span>{number(metric.max, 2)}</span>
                <span className="font-semibold text-primary">{number(metric.latest, 2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {data.run.notes && (
        <section className="rounded-lg border border-border/50 bg-muted/15 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test notes</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{data.run.notes}</p>
        </section>
      )}

      {onViewRun && (
        <Button type="button" variant="outline" className="w-full" onClick={onViewRun}>
          <MapPinned className="mr-2 h-4 w-4" />View this route on the map
        </Button>
      )}
    </div>
  );
}

function ComparisonReport({ data }: { data: ComparisonResponse }) {
  const deltas = [
    ['Quality score', data.delta.qualityScoreDelta, 'pts'],
    ['Distance', data.delta.distanceDeltaKm, 'km'],
    ['Duration', data.delta.durationDeltaMinutes, 'min'],
    ['Average speed', data.delta.averageSpeedDeltaKph, 'km/h'],
    ['Battery used', data.delta.batteryUsedDelta, 'pts'],
  ] as const;

  return (
    <div className="space-y-5">
      <div className={cn(
        'rounded-lg border p-3 text-sm',
        data.compatibility.status === 'COMPARABLE' && 'border-emerald-500/25 bg-emerald-500/[0.06]',
        data.compatibility.status === 'PARTIAL' && 'border-amber-500/25 bg-amber-500/[0.06]',
        data.compatibility.status === 'INVALID' && 'border-red-500/25 bg-red-500/[0.06]',
      )}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{data.compatibility.status === 'COMPARABLE' ? 'Comparable runs' : data.compatibility.status === 'PARTIAL' ? 'Use comparison with caution' : 'Not directly comparable'}</span>
          <span className="font-mono text-xs">{data.compatibility.score}/100</span>
        </div>
        {data.compatibility.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{data.compatibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[data.left, data.right].map(({ run, analysis }, index) => (
          <div key={run.id} className="rounded-lg border border-border/50 bg-muted/15 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{index === 0 ? 'Baseline' : 'Candidate'}</p>
            <p className="mt-1 font-semibold">{run.name}</p>
            <div className="mt-3"><ScoreBadge score={analysis.qualityScore} /></div>
            <p className="mt-3 text-xs text-muted-foreground">{analysis.samples} {analysis.samples === 1 ? 'sample' : 'samples'} · {number(analysis.distanceKm)} km</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/50">
        {deltas.map(([label, value, unit]) => (
          <div key={label} className="flex items-center justify-between border-b border-border/40 px-4 py-3 text-sm last:border-b-0">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(
              'font-mono font-semibold',
              data.compatibility.status !== 'INVALID' && value !== null && value > 0 && 'text-emerald-500',
              data.compatibility.status !== 'INVALID' && value !== null && value < 0 && 'text-amber-500',
            )}>
              {value === null ? '—' : `${value > 0 ? '+' : ''}${number(value)} ${unit}`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Deltas show candidate minus baseline. A higher quality score is better; whether distance, duration, speed, or battery use is better depends on your test goal.
      </p>
    </div>
  );
}

export function FieldTestManager({ deviceId, canManage, activeViewRunId, onViewRun }: FieldTestManagerProps) {
  const { data: runs, mutate, error: loadError } = useSWR<RunSummary[]>(
    deviceId ? `/api/runs?deviceId=${encodeURIComponent(deviceId)}` : null,
    fetcher,
    { refreshInterval: 5000 },
  );
  const [startOpen, setStartOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [hardwareVersion, setHardwareVersion] = React.useState('');
  const [firmwareVersion, setFirmwareVersion] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [activityType, setActivityType] = React.useState<'GROUND' | 'FLIGHT'>('GROUND');
  const [expectedIntervalSeconds, setExpectedIntervalSeconds] = React.useState('');
  const [minSamples, setMinSamples] = React.useState('10');
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importFormat, setImportFormat] = React.useState('AUTO');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [reportRunId, setReportRunId] = React.useState<string | null>(null);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [leftId, setLeftId] = React.useState('');
  const [rightId, setRightId] = React.useState('');

  const activeRun = runs?.find((run) => run.status === 'ACTIVE');
  const completedRuns = React.useMemo(
    () => runs?.filter((run) => run.status === 'COMPLETED') ?? [],
    [runs],
  );
  const { data: report, error: reportError } = useSWR<RunReportResponse>(
    reportRunId ? `/api/runs/${reportRunId}` : null,
    fetcher,
  );
  const comparisonUrl = compareOpen && leftId && rightId && leftId !== rightId
    ? `/api/runs/compare?left=${encodeURIComponent(leftId)}&right=${encodeURIComponent(rightId)}`
    : null;
  const { data: comparison, error: comparisonError } = useSWR<ComparisonResponse>(comparisonUrl, fetcher);

  React.useEffect(() => {
    setName(`Field test ${format(new Date(), 'MMM d HH:mm')}`);
    setActionError(null);
    setReportRunId(null);
    setImportFile(null);
  }, [deviceId]);

  React.useEffect(() => {
    if (completedRuns.length < 2) return;
    if (!completedRuns.some((run) => run.id === leftId)) setLeftId(completedRuns[1].id);
    if (!completedRuns.some((run) => run.id === rightId)) setRightId(completedRuns[0].id);
  }, [completedRuns, leftId, rightId]);

  const startRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deviceId) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await fetcher('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          name,
          hardwareVersion,
          firmwareVersion,
          notes,
          activityType,
          expectedIntervalSeconds: expectedIntervalSeconds ? Number(expectedIntervalSeconds) : null,
          minSamples: Number(minSamples) || (activityType === 'FLIGHT' ? 10 : 2),
        }),
      });
      await mutate();
      setStartOpen(false);
      setHardwareVersion('');
      setFirmwareVersion('');
      setNotes('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start field test');
    } finally {
      setSubmitting(false);
    }
  };

  const importFlightLog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deviceId || !importFile) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.set('deviceId', deviceId);
      form.set('name', name);
      form.set('hardwareVersion', hardwareVersion);
      form.set('firmwareVersion', firmwareVersion);
      form.set('notes', notes);
      form.set('format', importFormat);
      form.set('file', importFile);
      const result = await fetcher('/api/runs/import', { method: 'POST', body: form });
      await mutate();
      setImportOpen(false);
      setImportFile(null);
      setReportRunId(result.run.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to import flight log');
    } finally {
      setSubmitting(false);
    }
  };

  const finishRun = async () => {
    if (!activeRun) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/runs/${activeRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Unable to finish field test');
      await mutate();
      setReportRunId(activeRun.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to finish field test');
    } finally {
      setSubmitting(false);
    }
  };

  if (!deviceId) {
    return <div className="rounded-lg border border-dashed border-border/50 p-3 text-xs text-muted-foreground">Select a device to start a field test.</div>;
  }

  return (
    <>
      <section className="rounded-lg border border-border/40 bg-background/60 p-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-xs font-semibold">Field tests</h2>
              <p className="truncate text-[10px] text-muted-foreground">Capture · diagnose · compare</p>
            </div>
          </div>
          {canManage && !activeRun && (
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1 h-3 w-3" />Import flight
              </Button>
              <Button type="button" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setStartOpen(true)}>
                <Play className="mr-1 h-3 w-3" />Start
              </Button>
            </div>
          )}
        </div>

        {loadError && <p className="mt-3 text-xs text-destructive">Unable to load field tests.</p>}
        {actionError && <p className="mt-3 text-xs text-destructive">{actionError}</p>}

        {activeRun && (
          <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  <Radio className="h-3 w-3 animate-pulse" />Recording
                </div>
                <p className="mt-1 truncate text-xs font-semibold">{activeRun.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{activeRun._count.positions} {activeRun._count.positions === 1 ? 'sample' : 'samples'} · started {formatDistanceToNow(new Date(activeRun.startedAt), { addSuffix: true })}</p>
              </div>
              {canManage && (
                <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={finishRun} disabled={submitting} aria-label="Finish field test">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                </Button>
              )}
            </div>
          </div>
        )}

        {completedRuns.length > 0 && (
          <div className="mt-3 space-y-1">
            {completedRuns.slice(0, 3).map((run) => (
              <div key={run.id} className={cn('flex items-center gap-1 rounded-md px-1 hover:bg-muted/50', activeViewRunId === run.id && 'bg-primary/10 text-primary')}>
                <button type="button" onClick={() => setReportRunId(run.id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1 py-1.5 text-left text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 truncate">{run.activityType === 'FLIGHT' && <Plane className="h-3 w-3 shrink-0" />}<span className="truncate">{run.name}</span></span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{run._count.positions}</span>
                </button>
                {onViewRun && <button type="button" onClick={() => onViewRun({ id: run.id, name: run.name })} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-primary" aria-label={`View ${run.name} on map`}><MapPinned className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
        )}

        {completedRuns.length >= 2 && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 w-full text-[10px]" onClick={() => setCompareOpen(true)}>
            <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />Compare test runs
          </Button>
        )}
      </section>

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Start a field test</DialogTitle>
            <DialogDescription>New positions from this device will be attached to the run until you finish it.</DialogDescription>
          </DialogHeader>
          <form onSubmit={startRun} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="run-name">Run name</Label><Input id="run-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 text-sm"><span className="font-medium">Activity</span><select value={activityType} onChange={(event) => setActivityType(event.target.value as 'GROUND' | 'FLIGHT')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="GROUND">Ground / general</option><option value="FLIGHT">Drone flight</option></select></label>
              <div className="space-y-2"><Label htmlFor="expected-interval">Expected interval (s)</Label><Input id="expected-interval" type="number" min="1" max="3600" value={expectedIntervalSeconds} onChange={(event) => setExpectedIntervalSeconds(event.target.value)} placeholder="Auto" /></div>
              <div className="space-y-2"><Label htmlFor="minimum-samples">Minimum samples</Label><Input id="minimum-samples" type="number" min="2" max="10000" value={minSamples} onChange={(event) => setMinSamples(event.target.value)} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="hardware-version">Hardware</Label><Input id="hardware-version" value={hardwareVersion} onChange={(event) => setHardwareVersion(event.target.value)} placeholder="PCB v2 · antenna B" /></div>
              <div className="space-y-2"><Label htmlFor="firmware-version">Firmware</Label><Input id="firmware-version" value={firmwareVersion} onChange={(event) => setFirmwareVersion(event.target.value)} placeholder="0.9.4 · commit abc123" /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-notes">Test goal and notes</Label>
              <textarea id="run-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} placeholder="What changed, and what should this run prove?" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}Start recording</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reportRunId)} onOpenChange={(open) => !open && setReportRunId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[900px]">
          <DialogHeader><DialogTitle>Field test report</DialogTitle><DialogDescription>Deterministic route, telemetry, and data-quality results.</DialogDescription></DialogHeader>
          {!report && !reportError && <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          {reportError && <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{reportError.message}</p>}
          {report && <RunReport data={report} onViewRun={onViewRun ? () => { onViewRun({ id: report.run.id, name: report.run.name }); setReportRunId(null); } : undefined} />}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Import a drone flight</DialogTitle>
            <DialogDescription>Turn a flight-controller log into a replayable run with altitude, speed, attitude, GPS, signal, and power telemetry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={importFlightLog} className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-3 text-xs leading-5 text-muted-foreground">
              Supported now: GPX and CSV exported or decoded from PX4, ArduPilot, Betaflight, or your own DIY logger. Raw .ulg, .bin, .bbl and DJI account sync will use dedicated adapters in a later release.
            </div>
            <div className="space-y-2"><Label htmlFor="flight-name">Flight name</Label><Input id="flight-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm"><span className="font-medium">Log profile</span><select value={importFormat} onChange={(event) => setImportFormat(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="AUTO">Auto detect</option><option value="GENERIC_CSV">Generic CSV</option><option value="PX4_CSV">PX4 CSV</option><option value="ARDUPILOT_CSV">ArduPilot CSV</option><option value="BETAFLIGHT_CSV">Betaflight CSV</option><option value="GPX">GPX</option></select></label>
              <div className="space-y-2"><Label htmlFor="flight-log">Flight log</Label><Input id="flight-log" type="file" accept=".csv,.gpx,text/csv,application/gpx+xml" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} required /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="import-hardware">Aircraft / hardware</Label><Input id="import-hardware" value={hardwareVersion} onChange={(event) => setHardwareVersion(event.target.value)} placeholder="5-inch quad · Pixhawk 6C" /></div>
              <div className="space-y-2"><Label htmlFor="import-firmware">Flight firmware</Label><Input id="import-firmware" value={firmwareVersion} onChange={(event) => setFirmwareVersion(event.target.value)} placeholder="PX4 1.16 · Betaflight 4.5" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="import-notes">Flight goal and notes</Label><textarea id="import-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
            <Button type="submit" className="w-full" disabled={submitting || !name.trim() || !importFile}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import and analyze flight</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader><DialogTitle>Compare field tests</DialogTitle><DialogDescription>Use an older run as the baseline and a newer run as the candidate.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm"><span className="font-medium">Baseline</span><select value={leftId} onChange={(event) => setLeftId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{completedRuns.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
            <label className="space-y-2 text-sm"><span className="font-medium">Candidate</span><select value={rightId} onChange={(event) => setRightId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{completedRuns.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}</select></label>
          </div>
          {leftId === rightId && <p className="text-sm text-amber-500">Choose two different runs.</p>}
          {comparisonUrl && !comparison && !comparisonError && <div className="flex h-36 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          {comparisonError && <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{comparisonError.message}</p>}
          {comparison && <ComparisonReport data={comparison} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
