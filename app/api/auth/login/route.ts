import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, verifyPassword, signSession } from "@/lib/auth";
import { clientIdentifier, consumeRateLimit } from "@/lib/rate-limit";
import { readJsonBody, RequestValidationError } from "@/lib/request-validation";

export async function POST(req: NextRequest) {
  const rateLimit = await consumeRateLimit('login', clientIdentifier(req), 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch (error) {
    const status = error instanceof RequestValidationError ? error.status : 400;
    return NextResponse.json({ error: "Invalid login request." }, { status });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || username.length > 80 || !password || password.length > 256) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await signSession({ username: user.username, userId: user.id, role: user.role });

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
