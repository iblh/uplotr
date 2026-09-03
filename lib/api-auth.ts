import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface RequestUser {
  id: string;
  username: string;
  role: string;
}

export async function getRequestUser(req: NextRequest): Promise<RequestUser | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, role: true },
  });
}

function checkSameOrigin(req: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}

export async function requireUser(req: NextRequest): Promise<RequestUser | NextResponse> {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }
  const user = await getRequestUser(req);
  return user ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function requireAdmin(req: NextRequest): Promise<RequestUser | NextResponse> {
  const result = await requireUser(req);
  if (result instanceof NextResponse) return result;
  return result.role === 'admin'
    ? result
    : NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function isAuthResponse(value: RequestUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
