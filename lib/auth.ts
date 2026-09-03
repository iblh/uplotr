import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE = 'lorawan_auth';
const SECRET_KEY = process.env.AUTH_SECRET;
const ALG = 'HS256';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function signSession(payload: { username: string; userId: string; role: string }): Promise<string> {
  if (!SECRET_KEY) {
    throw new Error('AUTH_SECRET is not set');
  }
  const secret = new TextEncoder().encode(SECRET_KEY);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySession(token: string): Promise<{ username: string; userId: string; role: string } | null> {
  if (!SECRET_KEY) return null;
  try {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.username !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return payload as { username: string; userId: string; role: string };
  } catch (e) {
    return null;
  }
}
