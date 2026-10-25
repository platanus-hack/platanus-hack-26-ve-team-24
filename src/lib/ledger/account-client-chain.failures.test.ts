import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { generateSigner } from '../credential/keys';
import { createChainAccountClient } from './account-client-chain';
import { LedgerWriteError } from './account-types';

const FACTORY = '0x1c6ecbbce4931b0f8930eb8acd5cd2c2fa189c39';
const LEDGER = '0x1011062a3c070da65fb0a08452658fd21d16927b';
const ACCOUNT = '0x3333333333333333333333333333333333333333';

const accountOk = () => Response.json({ address: ACCOUNT, deployed: true, ledger: LEDGER });

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_LEDGER_MODE', 'chain');
  vi.stubEnv('NEXT_PUBLIC_LEDGER_CHAIN_ID', '11155111');
  vi.stubEnv('NEXT_PUBLIC_ENTRY_POINT_ADDRESS', '0x0000000071727De22E5E9d8BAf0edAc6f37da032');
  vi.stubEnv('NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS', FACTORY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('a non-JSON server failure is reported as a ledger error, not a TypeError', async () => {
  const { signer } = await generateSigner();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('/api/ledger/account')
        ? accountOk()
        : new Response('<html>Internal Server Error</html>', { status: 500 }),
    ),
  );

  const client = await createChainAccountClient({ signer });
  const error = await client.revoke(`0x${'ab'.repeat(32)}`).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(LedgerWriteError);
  expect((error as LedgerWriteError).technical).toContain('500');
});

test('a refused account lookup is not reported as a busy ledger', async () => {
  const { signer } = await generateSigner();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('bad coordinates', { status: 400 })),
  );

  const error = await createChainAccountClient({ signer }).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(LedgerWriteError);
  expect((error as LedgerWriteError).message).toBe('This device could not prove its account');
});
