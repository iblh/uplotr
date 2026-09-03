import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import packageJson from '@/package.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'healthy', database: 'connected', version: packageJson.version },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', database: 'unavailable', version: packageJson.version },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
