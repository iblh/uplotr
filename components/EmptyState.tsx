"use client";

import * as React from "react";
import Link from 'next/link';
import { CheckCircle2, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState() {
  const [copied, setCopied] = React.useState(false);
  const curlCommand = `curl -X POST http://localhost:3000/api/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "device_id": "my-first-tracker",
    "lat": 37.7749,
    "lon": -122.4194,
    "battery": 98
  }'`;

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl space-y-7 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full border border-primary/30 bg-primary/10 p-4">
            <div className="h-full w-full rounded-full bg-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">No devices yet</h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Create an API key in Settings, then send your first location payload.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card/50 p-6 text-left shadow-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Terminal className="h-4 w-4" /> Quick start via REST API
          </div>
          <div className="group relative">
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs">
              <code>{curlCommand}</code>
            </pre>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={cn("absolute right-3 top-3", copied && "text-emerald-500")}
              onClick={copyToClipboard}
              aria-label="Copy ingest example"
            >
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline"><Link href="/demo">Open public demo</Link></Button>
            <Button asChild variant="ghost"><Link href="/docs/device-setup">Device setup guide</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
