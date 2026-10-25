import { afterEach, expect, test, vi } from 'vitest';
import { respondWithLedger } from './gateway';
import { LedgerUnreachableError } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

test('a transport failure answers JSON 503', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await respondWithLedger(async () => {
    throw new LedgerUnreachableError('The Sepolia RPC did not answer');
  });
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: 'LEDGER_UNREACHABLE' });
});

// Escaping instead produced Next's HTML error page; the browser then read it as an unreachable
// ledger and the real exception existed nowhere.
test('a server-side fault answers JSON 500 instead of escaping', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await respondWithLedger(async () => {
    throw new Error('Invalid environment variables: PAYMASTER_ADDRESS');
  });
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: 'INTERNAL' });
  expect(logged).toHaveBeenCalled();
});
