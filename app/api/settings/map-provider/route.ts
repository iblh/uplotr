import { NextRequest, NextResponse } from 'next/server';
import {
  MAP_PROVIDER_VALUES,
  parseMapProvider,
  getDefaultMapProvider,
} from '@/lib/map-provider-config';
import {
  getMapboxToken,
  getMapProvider,
  setMapboxToken,
  setMapProvider,
} from '@/lib/map-provider';
import { isAuthResponse, requireAdmin, requireUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (isAuthResponse(auth)) return auth;
    const [provider, mapboxToken] = await Promise.all([getMapProvider(), getMapboxToken()]);
    return NextResponse.json({
      provider,
      defaultProvider: getDefaultMapProvider(),
      supportedProviders: MAP_PROVIDER_VALUES,
      mapboxToken,
    });
  } catch (error) {
    console.error('[Settings MapProvider] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthResponse(auth)) return auth;
    const body = await req.json();
    const parsedProvider = body?.provider === undefined ? null : parseMapProvider(body?.provider);

    if (body?.provider !== undefined && !parsedProvider) {
      return NextResponse.json(
        {
          error: `Invalid provider. Supported values: ${MAP_PROVIDER_VALUES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    const [currentProvider, currentMapboxToken] = await Promise.all([
      getMapProvider({ forceRefresh: true }),
      getMapboxToken({ forceRefresh: true }),
    ]);

    const providerToSave = parsedProvider ?? currentProvider;
    const incomingMapboxToken =
      body?.mapboxToken === undefined ? undefined : String(body.mapboxToken);
    const mapboxTokenToSave =
      incomingMapboxToken === undefined ? currentMapboxToken : incomingMapboxToken;

    const savedProvider =
      parsedProvider === null ? currentProvider : await setMapProvider(providerToSave);
    const savedMapboxToken =
      incomingMapboxToken === undefined
        ? currentMapboxToken
        : await setMapboxToken(mapboxTokenToSave);

    return NextResponse.json({
      provider: savedProvider,
      supportedProviders: MAP_PROVIDER_VALUES,
      mapboxToken: savedMapboxToken,
    });
  } catch (error) {
    console.error('[Settings MapProvider] PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
