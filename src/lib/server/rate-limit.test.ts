import { expect, test } from 'vitest';
import { HttpError } from './http';
import { rateLimit } from './rate-limit';

const request = (forwarded: string) =>
  new Request('http://localhost/probe', { headers: { 'x-forwarded-for': forwarded } });

test('a spoofed leading X-Forwarded-For entry cannot open a fresh window', () => {
  const limit = { limit: 2, windowMs: 60_000 };
  const now = 1_000;
  // One real client behind one proxy; only the entries the caller wrote change.
  rateLimit(request('1.1.1.1, 9.9.9.9'), 'spoof', limit, now);
  rateLimit(request('2.2.2.2, 9.9.9.9'), 'spoof', limit, now);
  expect(() => rateLimit(request('3.3.3.3, 9.9.9.9'), 'spoof', limit, now)).toThrow(HttpError);
});

test('a second real client still gets its own window', () => {
  const limit = { limit: 1, windowMs: 60_000 };
  const now = 2_000;
  rateLimit(request('4.4.4.4, 8.8.8.8'), 'window', limit, now);
  expect(() => rateLimit(request('4.4.4.4, 8.8.8.8'), 'window', limit, now)).toThrow(HttpError);
  expect(() => rateLimit(request('5.5.5.5, 7.7.7.7'), 'window', limit, now)).not.toThrow();
});

test('x-real-ip is used when no forwarded chain is present', () => {
  const limit = { limit: 1, windowMs: 60_000 };
  const now = 3_000;
  const withRealIp = () => new Request('http://localhost/probe', { headers: { 'x-real-ip': '6.6.6.6' } });
  rateLimit(withRealIp(), 'realip', limit, now);
  expect(() => rateLimit(withRealIp(), 'realip', limit, now)).toThrow(HttpError);
});
