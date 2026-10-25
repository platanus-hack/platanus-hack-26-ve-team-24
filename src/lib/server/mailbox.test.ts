import { describe, expect, it } from 'vitest';
import { createShareSchema, isExpired, isId, newId } from './mailbox';
import { rateLimit } from './rate-limit';

const req = (ip: string) => new Request('http://x', { headers: { 'x-forwarded-for': ip } });

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
  it('caps share ttl at 7 days', () => {
    expect(createShareSchema.safeParse({ ciphertext: 'a', ttlSec: 604800 }).success).toBe(true);
    expect(createShareSchema.safeParse({ ciphertext: 'a', ttlSec: 604801 }).success).toBe(false);
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
