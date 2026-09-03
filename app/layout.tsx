import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css"; // Important for mapbox
import "maplibre-gl/dist/maplibre-gl.css";
import { ThemeProvider } from "@/components/theme-provider";
import packageJson from '@/package.json';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://uplotr.com'),
  title: { default: 'uplotr — Open-source tracking console', template: '%s · uplotr' },
  description: "A focused, self-hosted tracking console for REST and LoRaWAN devices, with map visualization and trajectory replay.",
  keywords: ["uplotr", "LoRaWAN", "Tracker", "Map", "SenseCAP", "Helium", "TTN", "GPS", "IoT"],
  // icons field removed to let Next.js automatically handle app/icon.svg
  openGraph: {
    title: "uplotr — Open-source tracking console",
    description: "Get REST and LoRaWAN device locations onto a map in minutes.",
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
      </body>
    </html>
  );
}
