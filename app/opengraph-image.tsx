import { ImageResponse } from 'next/og';

export const alt = 'uplotr — Open-source tracking console';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#07090d', color: 'white' }}><div style={{ color: '#7dd3fc', fontSize: 28, letterSpacing: 6 }}>UPLOTR</div><div style={{ marginTop: 28, maxWidth: 900, fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Get device locations onto a map in minutes.</div><div style={{ marginTop: 32, fontSize: 28, color: '#a1a1aa' }}>Open-source · REST + LoRaWAN · Docker ready</div></div>, size);
}
