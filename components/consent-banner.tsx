"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  CONSENT_CHANGE_EVENT,
  type ConsentChoice,
  readConsent,
  writeConsent,
} from "@/lib/consent"

/**
 * Asks the visitor to opt in to analytics before anything is loaded.
 *
 * Only shown on deployments that actually have analytics configured, and only
 * until a choice is recorded. Declining is a first-class button, not a dismiss
 * affordance: consent has to be freely given to count.
 */
export function ConsentBanner() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [decided, setDecided] = React.useState(true);

  React.useEffect(() => {
    // Starts hidden so the server-rendered markup matches, then reveals only
    // when this visitor has genuinely not answered yet.
    setDecided(readConsent() !== null);
  }, []);

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    setDecided(true);
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  };

  if (!gaId || decided) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p id="consent-banner-title" className="text-sm font-medium">
            Help us improve uplotr?
          </p>
          <p className="text-sm text-muted-foreground">
            We would like to use Google Analytics to understand how the site is
            used. Nothing is loaded and no cookies are set unless you accept.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose('denied')}>
            Decline
          </Button>
          <Button size="sm" onClick={() => choose('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
