import { ImageResponse } from 'next/og';

export const alt = 'uplotr — Field testing for moving hardware';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#07090d', color: 'white' }}><div style={{ color: '#7dd3fc', fontSize: 28, letterSpacing: 6 }}>UPLOTR</div><div style={{ marginTop: 28, maxWidth: 980, fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>Test moving hardware without building a tracking backend.</div><div style={{ marginTop: 32, fontSize: 28, color: '#a1a1aa' }}>Capture · Diagnose · Compare · Self-host</div></div>, size);
}
