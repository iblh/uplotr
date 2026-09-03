import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthResponse } from '@/lib/api-auth';
import { apiKeyPrefix, generateApiKey, hashApiKey } from '@/lib/api-key';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;

    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(keys);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    
    const key = generateApiKey();

    const newKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash: hashApiKey(key),
        prefix: apiKeyPrefix(key),
      },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    });

    return NextResponse.json({ ...newKey, key }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
