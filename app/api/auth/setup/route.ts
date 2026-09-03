import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, hashPassword, signSession } from "@/lib/auth";
import {
  getDefaultMapProvider,
  MAP_PROVIDER_VALUES,
  parseMapProvider,
} from "@/lib/map-provider-config";
import {
  getDefaultMapboxToken,
  MAPBOX_TOKEN_SETTING_KEY,
  MAP_PROVIDER_SETTING_KEY,
} from "@/lib/map-provider";
import { readJsonBody, RequestValidationError } from "@/lib/request-validation";

class SetupAlreadyCompletedError extends Error {}

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({
    needsSetup: count === 0,
    defaultMapProvider: getDefaultMapProvider(),
    supportedMapProviders: MAP_PROVIDER_VALUES,
  });
}

export async function POST(req: NextRequest) {
  if ((await prisma.user.count()) > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch (error) {
    const status = error instanceof RequestValidationError ? error.status : 400;
    return NextResponse.json({ error: "Invalid setup request" }, { status });
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const parsedMapProvider = parseMapProvider(body?.mapProvider);
  const selectedMapProvider = parsedMapProvider ?? getDefaultMapProvider();
  const parsedMapboxToken =
    typeof body?.mapboxToken === "string" ? body.mapboxToken.trim() : "";
  const selectedMapboxToken = parsedMapboxToken || getDefaultMapboxToken();

  if (body?.mapProvider && !parsedMapProvider) {
    return NextResponse.json(
      {
        error: `Invalid map provider. Supported values: ${MAP_PROVIDER_VALUES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (!username || username.length > 80 || password.length < 8 || password.length > 256) {
    return NextResponse.json({ error: "Invalid username or password (password must be 8–256 characters)" }, { status: 400 });
  }

  if (selectedMapProvider === "MAPBOX" && !selectedMapboxToken) {
    return NextResponse.json(
      { error: "Mapbox token is required when provider is MAPBOX." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      if (count > 0) throw new SetupAlreadyCompletedError();

      const createdUser = await tx.user.create({
        data: {
          username: String(username),
          passwordHash,
          role: "admin",
        },
      });

    await tx.systemSetting.upsert({
      where: { key: MAP_PROVIDER_SETTING_KEY },
      update: { value: selectedMapProvider },
      create: { key: MAP_PROVIDER_SETTING_KEY, value: selectedMapProvider },
    });

    if (parsedMapboxToken) {
      await tx.systemSetting.upsert({
        where: { key: MAPBOX_TOKEN_SETTING_KEY },
        update: { value: parsedMapboxToken },
        create: { key: MAPBOX_TOKEN_SETTING_KEY, value: parsedMapboxToken },
      });
    }

      return createdUser;
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error instanceof SetupAlreadyCompletedError) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      const setupCompleted = (await prisma.user.count()) > 0;
      return NextResponse.json(
        { error: setupCompleted ? "Setup already completed" : "Setup is already in progress; retry shortly" },
        { status: setupCompleted ? 403 : 409 },
      );
    }
    throw error;
  }

  // Auto login
  const token = await signSession({ username: user.username, userId: user.id, role: "admin" });
  
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
