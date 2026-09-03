import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        // Exclude passwordHash
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
