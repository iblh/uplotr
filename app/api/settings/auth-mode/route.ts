import { NextRequest, NextResponse } from 'next/server';
import { AUTH_MODE_VALUES, getAuthMode, getDefaultAuthMode, parseAuthMode, setAuthMode } from '@/lib/auth-mode';
import { isAuthResponse, requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;
    const mode = await getAuthMode();
    return NextResponse.json({
      mode,
      defaultMode: getDefaultAuthMode(),
      supportedModes: AUTH_MODE_VALUES,
    });
  } catch (error) {
    console.error('[Settings AuthMode] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;
    const body = await req.json();
    const mode = parseAuthMode(body?.mode);

    if (!mode) {
      return NextResponse.json(
        { error: `Invalid mode. Supported values: ${AUTH_MODE_VALUES.join(', ')}` },
        { status: 400 }
      );
    }

    const saved = await setAuthMode(mode);
    return NextResponse.json({ mode: saved, supportedModes: AUTH_MODE_VALUES });
  } catch (error) {
    console.error('[Settings AuthMode] PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
