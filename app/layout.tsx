import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css"; // Important for mapbox
import "maplibre-gl/dist/maplibre-gl.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent-banner";
import packageJson from '@/package.json';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://uplotr.com'),
  title: { default: 'uplotr — Field testing for moving hardware', template: '%s · uplotr' },
  description: "A self-hosted field-test workbench for GPS, LoRaWAN, DIY drones, and moving sensor projects with telemetry diagnostics and run comparison.",
  keywords: ["uplotr", "LoRaWAN", "Tracker", "Map", "SenseCAP", "Helium", "TTN", "GPS", "IoT"],
  // icons field removed to let Next.js automatically handle app/icon.svg
  openGraph: {
    title: "uplotr — Field testing for moving hardware",
    description: "Capture, diagnose, and compare GPS and sensor field tests without building a tracking backend.",
    type: "website",
    url: 'https://uplotr.com',
  },
  twitter: { card: 'summary_large_image' },
  applicationName: 'uplotr',
  generator: `uplotr ${packageJson.version}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <VercelAnalytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
