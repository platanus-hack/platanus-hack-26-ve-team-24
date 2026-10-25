import { z } from 'zod';

export const REQUEST_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const MAX_SHARE_TTL_SEC = 7 * 24 * 60 * 60;
export const MAX_SHARE_BYTES = 64 * 1024;

/** 128 random bits as 32 hex chars. The id is the only secret needed to poll or fetch. */
export const newId = (): string => Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
export const ID_PATTERN = /^[0-9a-f]{32}$/;
export const isId = (value: string) => ID_PATTERN.test(value);

export const isExpired = (expiresAt: Date, now = new Date()) => expiresAt.getTime() <= now.getTime();

const b64u32 = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const p256Jwk = z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: b64u32, y: b64u32 }).strict();

/** Schema check plus a curve check: the point must really be on P-256. */
export async function isOnCurve(jwk: z.output<typeof p256Jwk>, usage: 'ECDSA' | 'ECDH'): Promise<boolean> {
  try {
    await crypto.subtle.importKey('jwk', jwk, { name: usage, namedCurve: 'P-256' }, false, usage === 'ECDSA' ? ['verify'] : []);
    return true;
  } catch {
    return false;
  }
}

export const createRequestSchema = z.object({
  employer: z.string().regex(/^0x[0-9a-fA-F]{40}$/).transform((s) => s.toLowerCase()),
  employeeRef: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((value) => value.toUpperCase()),
  kind: z.enum(['CURRENT', 'PAST']),
  signJwk: p256Jwk,
  encJwk: p256Jwk,
});

export const createShareSchema = z.object({
  ciphertext: z.string().min(1).max(MAX_SHARE_BYTES),
  ttlSec: z.number().int().min(60).max(MAX_SHARE_TTL_SEC),
});
