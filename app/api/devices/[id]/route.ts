import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;

    const { id } = await params;

    await prisma.device.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Device Delete] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
