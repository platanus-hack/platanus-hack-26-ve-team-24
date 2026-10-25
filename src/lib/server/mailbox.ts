import { z } from 'zod';

export const MAX_SHARE_TTL_SEC = 7 * 24 * 60 * 60;
export const MAX_SHARE_BYTES = 64 * 1024;

/** 128 random bits as 32 hex chars. The id is the only secret needed to poll or fetch. */
export const newId = (): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
export const ID_PATTERN = /^[0-9a-f]{32}$/;
export const isId = (value: string) => ID_PATTERN.test(value);

export const isExpired = (expiresAt: Date, now = new Date()) =>
  expiresAt.getTime() <= now.getTime();

export const createShareSchema = z.object({
  ciphertext: z.string().min(1).max(MAX_SHARE_BYTES),
  ttlSec: z.number().int().min(60).max(MAX_SHARE_TTL_SEC),
});
