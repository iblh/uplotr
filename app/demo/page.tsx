import type { Metadata } from 'next';
import { DemoDashboard } from '@/components/demo/DemoDashboard';

export const metadata: Metadata = {
  title: 'Interactive Demo',
  description: 'Explore a deterministic synthetic hardware field test with telemetry and data-quality diagnostics.',
};

export default function DemoPage() {
  return <DemoDashboard />;
}
