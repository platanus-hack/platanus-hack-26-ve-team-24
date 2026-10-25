import { afterEach, expect, test, vi } from 'vitest';
import { POST } from './route';

const SENDER = '0x000000000000000000000000000000000000dEaD';
// execute(address,uint256,bytes) with an empty payload: a well-formed request.
const CALL_DATA =
  '0xb61d27f6000000000000000000000000000000000000000000000000000000000000dead000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000';

type Reply = { error?: { code: number; message: string }; result?: unknown };

async function rpc(method: string, params: unknown[]): Promise<Reply> {
  const request = new Request('http://localhost/api/bundler', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await (await POST(request)).json()) as Reply;
}

afterEach(() => {
  vi.unstubAllEnvs();
  // context() memoizes on globalThis; a config test must not leak into the next one.
  delete (globalThis as { __bundlerCtx?: unknown }).__bundlerCtx;
});

function stubBrokenConfig() {
  vi.stubEnv('LEDGER_RPC_URL', 'https://sepolia.example.org');
  vi.stubEnv('PAYMASTER_ADDRESS', '0x6141391f87e53ad908626ecc222399aca8f9ea08');
  // The shape that actually shipped: a 20-byte address where a 32-byte key belongs.
  vi.stubEnv('RELAYER_PRIVATE_KEY', '0xe71dE5C50CD438b1EBc3ceD01727A0B003C525bB');
}

test('a broken server config is reported as a config fault, not as bad params', async () => {
  stubBrokenConfig();
  const reply = await rpc('eth_sponsorUserOperation', [{ sender: SENDER, callData: CALL_DATA }]);
  expect(reply.error?.code).toBe(-32603);
  expect(reply.error?.message).toContain('RELAYER_PRIVATE_KEY');
});

test('the config fault never echoes the rejected value', async () => {
  stubBrokenConfig();
  const reply = await rpc('eth_sponsorUserOperation', [{ sender: SENDER, callData: CALL_DATA }]);
  expect(reply.error?.message).not.toContain('e71dE5C50CD438b1EBc3ceD01727A0B003C525bB');
});

test('a malformed request still reads as bad params, without blaming the config', async () => {
  stubBrokenConfig();
  const reply = await rpc('eth_sponsorUserOperation', [{ sender: SENDER }]);
  expect(reply.error?.code).toBe(-32602);
  expect(reply.error?.message).toBe('Invalid params');
});
