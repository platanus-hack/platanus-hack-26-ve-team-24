import { decodeFunctionData, hexToBytes, toHex } from 'viem';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { generateSigner, verifyEs256 } from '../credential/keys';
import { consortiumAccountAbi, ledgerAbi } from './abi';
import { createChainAccountClient } from './account-client-chain';
import { LedgerWriteError } from './account-types';
import { signOperation, type UserOperation } from './userop';

const FACTORY = '0x1c6ecbbce4931b0f8930eb8acd5cd2c2fa189c39';
const LEDGER = '0x1011062a3c070da65fb0a08452658fd21d16927b';
const PAYMASTER = '0x56a6692fd09229c10d99cfff29732b76a69dde5d';
const ACCOUNT = '0x3333333333333333333333333333333333333333';
const TX = `0x${'ee'.repeat(32)}`;

const SPONSORED = {
  nonce: '0x0',
  callGasLimit: '0x30d40',
  verificationGasLimit: '0x2191c0',
  preVerificationGas: '0x10000',
  maxFeePerGas: '0x3b9aca00',
  maxPriorityFeePerGas: '0x3b9aca00',
  paymaster: PAYMASTER,
  paymasterVerificationGasLimit: '0x186a0',
  paymasterPostOpGasLimit: '0x0',
  paymasterData: '0x1234',
};

function stubNetwork(rpc: (method: string, params: unknown[]) => unknown, deployed = false) {
  const calls: { method: string; params: unknown[] }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/ledger/account')) {
        return Response.json({ address: ACCOUNT, deployed, ledger: LEDGER });
      }
      const { method, params } = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      calls.push({ method, params });
      return Response.json({ jsonrpc: '2.0', id: 1, result: rpc(method, params) });
    }),
  );
  return calls;
}

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

describe('userop signing', () => {
  test('the signature is keyId | r | s and verifies over the userOp hash', async () => {
    const { signer } = await generateSigner();
    const unsigned = {
      sender: ACCOUNT,
      callData: '0x',
      nonce: BigInt(1),
      callGasLimit: BigInt(100_000),
      verificationGasLimit: BigInt(700_000),
      preVerificationGas: BigInt(60_000),
      maxFeePerGas: BigInt(1_000_000_000),
      maxPriorityFeePerGas: BigInt(1_000_000_000),
      paymaster: PAYMASTER,
      paymasterVerificationGasLimit: BigInt(100_000),
      paymasterPostOpGasLimit: BigInt(0),
      paymasterData: '0x1234',
      signature: '0x',
    } as UserOperation;
    const { operation, hash } = await signOperation(unsigned, signer, 11155111);
    const bytes = hexToBytes(operation.signature);
    expect(bytes).toHaveLength(96);
    expect(toHex(bytes.slice(0, 32))).toBe(signer.keyId);
    expect(await verifyEs256(signer.jwk, hexToBytes(hash), bytes.slice(32))).toBe(true);
  });
});

describe('chain account client', () => {
  test('the first op carries initCode, calls the Ledger, and the user pays nothing', async () => {
    const { signer } = await generateSigner();
    const calls = stubNetwork((method) => {
      if (method === 'eth_sponsorUserOperation') return SPONSORED;
      if (method === 'eth_getUserOperationReceipt') {
        return { success: true, actualGasCost: '0x2a', receipt: { transactionHash: TX, blockNumber: '0x64' } };
      }
      return `0x${'11'.repeat(32)}`;
    });
    const client = await createChainAccountClient({ signer });
    const result = await client.applyForAccreditation('Acme');

    expect(client.address).toBe(ACCOUNT);
    expect(result).toMatchObject({ txHash: TX, blockNumber: 100, feeWei: '0', sponsorFeeWei: '0x2a' });

    const sponsor = calls.find((call) => call.method === 'eth_sponsorUserOperation')!;
    const request = sponsor.params[0] as { factory?: string; callData: `0x${string}` };
    expect(request.factory).toBe(FACTORY);
    const execute = decodeFunctionData({ abi: consortiumAccountAbi, data: request.callData });
    expect(execute.functionName).toBe('execute');
    const [target, , data] = execute.args as [string, bigint, `0x${string}`];
    expect(target.toLowerCase()).toBe(LEDGER);
    expect(decodeFunctionData({ abi: ledgerAbi, data })).toMatchObject({
      functionName: 'applyForAccreditation',
      args: ['Acme'],
    });

    const sent = calls.find((call) => call.method === 'eth_sendUserOperation')!;
    const wire = sent.params[0] as { signature: string; paymasterData: string };
    expect(wire.paymasterData).toBe(SPONSORED.paymasterData); // the sponsor's fields travel unchanged
    expect(hexToBytes(wire.signature as `0x${string}`)).toHaveLength(96);
  }, 15_000);

  test('a deployed account sends no initCode', async () => {
    const { signer } = await generateSigner();
    const calls = stubNetwork((method) => {
      if (method === 'eth_sponsorUserOperation') return SPONSORED;
      if (method === 'eth_getUserOperationReceipt') {
        return { success: true, actualGasCost: '0x1', receipt: { transactionHash: TX, blockNumber: '0x1' } };
      }
      return `0x${'11'.repeat(32)}`;
    }, true);
    await (await createChainAccountClient({ signer })).anchor(`0x${'ab'.repeat(32)}`);
    const sponsor = calls.find((call) => call.method === 'eth_sponsorUserOperation')!;
    expect(sponsor.params[0]).not.toHaveProperty('factory');
  }, 15_000);

  test('a rejected signature reads as a sentence, with the technical text kept apart', async () => {
    const { signer } = await generateSigner();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/api/ledger/account')
          ? Response.json({ address: ACCOUNT, deployed: true, ledger: LEDGER })
          : Response.json({ jsonrpc: '2.0', id: 1, error: { code: -32500, message: 'AA24 signature error' } }),
      ),
    );
    const client = await createChainAccountClient({ signer });
    const error = await client.revoke(`0x${'ab'.repeat(32)}`).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LedgerWriteError);
    expect((error as LedgerWriteError).message).toBe('Tu clave de firma no está autorizada en esta cuenta');
    expect((error as LedgerWriteError).technical).toContain('AA24');
  });
});
