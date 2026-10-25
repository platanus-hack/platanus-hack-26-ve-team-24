import { describe, expect, test } from 'vitest';
import { HttpRequestError } from 'viem';
import { generateSigner } from '../credential/keys';
import { jwkCoordinates } from './account-address';
import {
  createChainReader,
  jwkFromCoordinates,
  toIssuerInfo,
  toKeyInfo,
  toRecordInfo,
  type ChainClient,
} from './chain';
import { LedgerUnreachableError } from './types';

const LEDGER = '0x1011062a3c070da65fb0a08452658fd21d16927b';
const FACTORY = '0x1c6ecbbce4931b0f8930eb8acd5cd2c2fa189c39';
const ACCOUNT = '0x2222222222222222222222222222222222222222';
const HASH = `0x${'ab'.repeat(32)}` as const;
const KEY_ID = `0x${'cd'.repeat(32)}` as const;

describe('mapping helpers', () => {
  test('coordinates round-trip to the JWK', async () => {
    const { signer } = await generateSigner();
    const { x, y } = jwkCoordinates(signer.jwk);
    expect(jwkFromCoordinates(x, y)).toEqual(signer.jwk);
  });

  test('issuer status and a null accreditedAt for PENDING', () => {
    const raw = { name: 'Acme', status: 1, appliedAt: BigInt(5), accreditedAt: BigInt(0), approvals: 1 };
    expect(toIssuerInfo(ACCOUNT, raw, 2)).toMatchObject({
      status: 'PENDING',
      accreditedAt: null,
      approvals: 1,
      quorum: 2,
    });
    expect(toIssuerInfo(ACCOUNT, { ...raw, status: 2, accreditedAt: BigInt(9) }, 2).accreditedAt).toBe(9);
  });

  test('a record that was never anchored is null; timestamps are epoch seconds', () => {
    const empty = { anchoredAt: BigInt(0), revokedAt: BigInt(0), keyId: KEY_ID, blockNumber: BigInt(0) };
    expect(toRecordInfo(ACCOUNT, HASH, empty)).toBeNull();
    expect(
      toRecordInfo(ACCOUNT, HASH, { ...empty, anchoredAt: BigInt(100), revokedAt: BigInt(200), blockNumber: BigInt(7) }),
    ).toEqual({ credentialHash: HASH, issuer: ACCOUNT, keyId: KEY_ID, anchoredAt: 100, revokedAt: 200, blockNumber: 7 });
  });

  test('an unknown owner is null, a removed one keeps its window', async () => {
    const { signer } = await generateSigner();
    const { x, y } = jwkCoordinates(signer.jwk);
    expect(toKeyInfo(KEY_ID, [x, y, BigInt(0), BigInt(0)])).toBeNull();
    expect(toKeyInfo(KEY_ID, [x, y, BigInt(10), BigInt(20)])).toMatchObject({ addedAt: 10, removedAt: 20 });
    expect(toKeyInfo(KEY_ID, [x, y, BigInt(10), BigInt(0)])?.removedAt).toBeNull();
  });
});

function fakeClient(overrides: Partial<ChainClient> = {}): ChainClient {
  const head = 9_000_000;
  return {
    readContract: async ({ functionName }) => {
      switch (functionName) {
        case 'quorum':
          return 2;
        case 'members':
          return [[ACCOUNT], ['Banco Demo']];
        case 'issuerList':
          return [ACCOUNT];
        case 'issuerOf':
          return { name: 'Acme', status: 2, appliedAt: BigInt(1), accreditedAt: BigInt(2), approvals: 2 };
        case 'recordOf':
          return { anchoredAt: BigInt(0), revokedAt: BigInt(0), keyId: KEY_ID, blockNumber: BigInt(0) };
        default:
          throw new Error(`unexpected ${functionName}`);
      }
    },
    getBlock: async (args) => {
      const number = args?.blockNumber ?? BigInt(head);
      return { number, timestamp: BigInt(1_800_000_000) + number, transactions: [1, 2] };
    },
    getCode: async () => undefined,
    getContractEvents: async ({ fromBlock }) => [
      { blockNumber: fromBlock, args: { issuer: ACCOUNT, credentialHash: HASH } },
    ],
    ...overrides,
  };
}

const config = { ledger: LEDGER as `0x${string}`, factory: FACTORY as `0x${string}`, deployBlock: 8_999_000 };

describe('chain reader', () => {
  test('state has the contracts shape: 16 blocks, members, no validators', async () => {
    const state = await createChainReader(fakeClient(), config).state();
    expect(state.chainId).toBe(11155111);
    expect(state.blockTimeSec).toBe(12);
    expect(state.blocks).toHaveLength(16);
    expect(state.blocks.at(-1)).toMatchObject({ number: 9_000_000, txCount: 2 });
    expect(state.members).toEqual([{ account: ACCOUNT, name: 'Banco Demo' }]);
    expect(state.issuers[0]).toMatchObject({ name: 'Acme', status: 'ACTIVE', quorum: 2 });
    expect(state).not.toHaveProperty('validators');
  });

  test('a provider that caps the log range is retried with smaller windows', async () => {
    const windows: bigint[] = [];
    const client = fakeClient({
      getContractEvents: async ({ fromBlock, toBlock }) => {
        windows.push(toBlock - fromBlock + BigInt(1));
        if (toBlock - fromBlock >= BigInt(10)) throw new Error('block range too large');
        return [{ blockNumber: toBlock, args: { issuer: ACCOUNT, credentialHash: HASH } }];
      },
    });
    const state = await createChainReader(client, config).state();
    expect(state.anchors).toHaveLength(10);
    expect(windows[0]).toBe(BigInt(1001)); // clamped by the deploy block
  });

  test('lookups of a missing key and record answer null', async () => {
    const reader = createChainReader(fakeClient(), config);
    expect(await reader.key(ACCOUNT, KEY_ID)).toBeNull();
    expect(await reader.record(ACCOUNT, HASH)).toBeNull();
    expect(await reader.keys(ACCOUNT)).toEqual([]);
  });

  test('a dead RPC becomes LedgerUnreachableError', async () => {
    const dead = fakeClient({
      getBlock: async () => {
        throw new HttpRequestError({ body: {}, url: 'https://sepolia.example.org', status: 503 });
      },
    });
    const reader = createChainReader(dead, config);
    await expect(reader.head()).rejects.toBeInstanceOf(LedgerUnreachableError);
    await expect(reader.state()).rejects.toBeInstanceOf(LedgerUnreachableError);
  });

  // A revert or a decoding bug is our fault, not the network's: calling it unreachable pointed every
  // investigation at Sepolia.
  test('a non-transport failure keeps its own identity instead of becoming unreachable', async () => {
    const broken = fakeClient({
      readContract: async () => {
        throw new Error('execution reverted: WrongStatus');
      },
    });
    const error = await createChainReader(broken, config)
      .issuer(ACCOUNT)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LedgerUnreachableError);
    expect((error as Error).message).toContain('WrongStatus');
  });
});
