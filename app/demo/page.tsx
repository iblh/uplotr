import type { Metadata } from 'next';
import { DemoDashboard } from '@/components/demo/DemoDashboard';

export const metadata: Metadata = {
  title: 'Interactive Demo',
  description: 'Explore uplotr with deterministic synthetic tracker data. No account or write access required.',
};

export default function DemoPage() {
  return <DemoDashboard />;
}
