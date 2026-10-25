import { describe, expect, it } from 'vitest';
import { createRequestSchema, createShareSchema, isExpired, isId, isOnCurve, newId } from './mailbox';
import { rateLimit } from './rate-limit';

const req = (ip: string) => new Request('http://x', { headers: { 'x-forwarded-for': ip } });

type Jwk = { kty: 'EC'; crv: 'P-256'; x: string; y: string };

async function p256Jwk(usage: 'ECDSA' | 'ECDH'): Promise<Jwk> {
  const pair = await crypto.subtle.generateKey(
    { name: usage, namedCurve: 'P-256' },
    true,
    usage === 'ECDSA' ? ['sign'] : ['deriveBits'],
  );
  const { kty, crv, x, y } = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as Required<JsonWebKey>;
  return { kty, crv, x, y } as Jwk;
}

describe('ids and expiry', () => {
  it('makes 32 hex chars, never repeating', () => {
    expect(newId()).toMatch(/^[0-9a-f]{32}$/);
    expect(newId()).not.toBe(newId());
    expect(isId('nope')).toBe(false);
  });

  it('expires at the boundary', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(isExpired(new Date(now.getTime()), now)).toBe(true);
    expect(isExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });
});

describe('schemas', () => {
  it('accepts a valid request and lowercases the employer', async () => {
    const parsed = createRequestSchema.parse({
      employer: `0x${'AB'.repeat(20)}`,
      employeeRef: 'E-1042',
      kind: 'CURRENT',
      signJwk: await p256Jwk('ECDSA'),
      encJwk: await p256Jwk('ECDH'),
    });
    expect(parsed.employer).toBe(`0x${'ab'.repeat(20)}`);
  });

  it('rejects a bad kind or an oversized reference', async () => {
    const base = {
      employer: `0x${'ab'.repeat(20)}`,
      signJwk: await p256Jwk('ECDSA'),
      encJwk: await p256Jwk('ECDH'),
    };
    expect(createRequestSchema.safeParse({ ...base, employeeRef: 'E', kind: 'X' }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...base, employeeRef: 'E'.repeat(41), kind: 'PAST' }).success).toBe(false);
  });

  it('caps share ttl at 7 days', () => {
    expect(createShareSchema.safeParse({ ciphertext: 'a', ttlSec: 604800 }).success).toBe(true);
    expect(createShareSchema.safeParse({ ciphertext: 'a', ttlSec: 604801 }).success).toBe(false);
  });

  it('normalizes the employee number so it matches the employer directory', async () => {
    const parsed = createRequestSchema.parse({
      employer: `0x${'ab'.repeat(20)}`,
      employeeRef: '  e-1042 ',
      kind: 'CURRENT',
      signJwk: await p256Jwk('ECDSA'),
      encJwk: await p256Jwk('ECDH'),
    });
    expect(parsed.employeeRef).toBe('E-1042');
  });

  it('rejects a point that is not on the curve', async () => {
    const jwk = await p256Jwk('ECDSA');
    expect(await isOnCurve(jwk, 'ECDSA')).toBe(true);
    expect(await isOnCurve({ ...jwk, y: jwk.x }, 'ECDSA')).toBe(false);
  });
});

describe('rateLimit', () => {
  it('blocks past the limit and resets after the window', () => {
    const opts = { limit: 2, windowMs: 1000 };
    rateLimit(req('9.9.9.9'), 't', opts, 0);
    rateLimit(req('9.9.9.9'), 't', opts, 1);
    expect(() => rateLimit(req('9.9.9.9'), 't', opts, 2)).toThrow(/Demasiados/);
    expect(() => rateLimit(req('9.9.9.9'), 't', opts, 1001)).not.toThrow();
    expect(() => rateLimit(req('8.8.8.8'), 't', opts, 2)).not.toThrow();
  });
});
