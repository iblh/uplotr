"use client"

import * as React from "react"
import Script from 'next/script';
import { CONSENT_CHANGE_EVENT, hasGrantedConsent } from '@/lib/consent';

/**
 * Google Analytics (GA4).
 *
 * Renders nothing unless NEXT_PUBLIC_GA_ID is set, so self-hosted instances
 * ship with no product analytics by default. Only the official uplotr.com
 * deployment sets this variable.
 *
 * Even then, gtag is not loaded until the visitor has explicitly opted in:
 * GA4 writes `_ga` cookies the moment it is configured, which counts as
 * storage requiring prior consent under GDPR/ePrivacy.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [consented, setConsented] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setConsented(hasGrantedConsent());

    // Read on mount rather than during render: the server has no storage, so
    // starting from `false` keeps the markup identical on both sides.
    sync();

    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  if (!gaId || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
