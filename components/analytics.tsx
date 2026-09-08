import Script from 'next/script';

/**
 * Google Analytics (GA4).
 *
 * Renders nothing unless NEXT_PUBLIC_GA_ID is set, so self-hosted instances
 * ship with no product analytics by default. Only the official uplotr.com
 * deployment sets this variable.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) return null;

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
