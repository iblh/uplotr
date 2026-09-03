import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const mappers = await prisma.payloadMapper.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(mappers);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { name, targetType, latPath, lonPath, tsPath, batteryPath, tempPath, lightPath } = body;

  if (!name || !latPath || !lonPath) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const mapper = await prisma.payloadMapper.create({
    data: {
      name,
      targetType: targetType || null,
      latPath,
      lonPath,
      tsPath: tsPath || null,
      batteryPath: batteryPath || null,
      tempPath: tempPath || null,
      lightPath: lightPath || null,
    },
  });

  return NextResponse.json(mapper);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await prisma.payloadMapper.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
