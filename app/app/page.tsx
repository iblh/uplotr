import type { Metadata } from 'next';
import Dashboard from '@/components/Dashboard';

export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false, follow: false },
};

export default function ConsolePage() {
  return <Dashboard />;
}
