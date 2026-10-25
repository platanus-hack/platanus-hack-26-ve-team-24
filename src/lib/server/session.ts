import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import type { Address, Hex } from '../credential/types';
import { HttpError } from './http';

export { HttpError };

export interface EmployerSession {
  account: Address;
  keyId: Hex;
}

export const SESSION_COOKIE = 'constancia_session';
export const SESSION_TTL_SEC = 8 * 60 * 60;
export const CHALLENGE_TTL_SEC = 2 * 60;

type TokenUse = 'challenge' | 'session';

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be 32+ characters');
  return new TextEncoder().encode(value);
}

async function sign(use: TokenUse, claims: EmployerSession & { nonce?: string }, ttlSec: number) {
  return new SignJWT({ ...claims, use })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret());
}

async function read(use: TokenUse, token: string): Promise<EmployerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (payload.use !== use) return null;
    return { account: payload.account as Address, keyId: payload.keyId as Hex };
  } catch {
    return null;
  }
}

// shortcut: stateless challenges can be replayed inside their 2 minutes; add a nonce store if that matters.
export const createChallenge = (who: EmployerSession) =>
  sign('challenge', { ...who, nonce: crypto.randomUUID() }, CHALLENGE_TTL_SEC);
export const readChallenge = (token: string) => read('challenge', token);
export const createSessionToken = (who: EmployerSession) => sign('session', who, SESSION_TTL_SEC);

export function sessionCookie(token: string, maxAgeSec = SESSION_TTL_SEC): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`;
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export async function requireEmployer(req: Request): Promise<EmployerSession> {
  const token = cookieValue(req, SESSION_COOKIE);
  const session = token ? await read('session', token) : null;
  if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Inicia sesión primero');
  return session;
}
