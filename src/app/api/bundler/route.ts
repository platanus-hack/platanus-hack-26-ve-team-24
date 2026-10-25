import { z } from 'zod';
import {
  BundlerError,
  chainId,
  estimateUserOperationGas,
  getUserOperationByHash,
  getUserOperationReceipt,
  sendUserOperation,
  sponsorUserOperation,
  supportedEntryPoints,
} from '@/lib/ledger/bundler';
import { rateLimit } from '@/lib/server/rate-limit';

const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

const RPC_REQUEST = z.object({
  id: z.union([z.number(), z.string(), z.null()]).default(null),
  method: z.string(),
  params: z.array(z.unknown()).default([]),
});
const HASH = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

type Params = unknown[];
const METHODS: Record<string, (params: Params) => unknown> = {
  eth_chainId: chainId,
  eth_supportedEntryPoints: supportedEntryPoints,
  eth_sponsorUserOperation: ([op]) => sponsorUserOperation(op),
  eth_estimateUserOperationGas: ([op]) => estimateUserOperationGas(op),
  eth_sendUserOperation: ([op]) => sendUserOperation(op),
  eth_getUserOperationReceipt: ([hash]) => getUserOperationReceipt(HASH.parse(hash) as `0x${string}`),
  eth_getUserOperationByHash: ([hash]) => getUserOperationByHash(HASH.parse(hash) as `0x${string}`),
};

const reply = (id: unknown, body: { result: unknown } | { error: { code: number; message: string } }) =>
  Response.json({ jsonrpc: '2.0', id, ...body });
const fail = (id: unknown, code: number, message: string) => reply(id, { error: { code, message } });

// shortcut: tolerate the A4-S1 rate-limit stub until it lands; remove once rateLimit is real.
function limit(request: Request) {
  try {
    rateLimit(request, 'bundler', RATE_LIMIT);
  } catch (error) {
    if (!(error instanceof Error && error.message.startsWith('not implemented'))) throw error;
  }
}

export async function POST(request: Request) {
  try {
    limit(request);
  } catch {
    return Response.json({ error: 'RATE_LIMITED', message: 'Demasiadas solicitudes' }, { status: 429 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(null, -32600, 'Request too large');
  const parsed = RPC_REQUEST.safeParse(safeJson(text));
  if (!parsed.success) return fail(null, -32600, 'Invalid request');
  const { id, method, params } = parsed.data;
  const handler = METHODS[method];
  if (!handler) return fail(id, -32601, 'Method not found');
  try {
    return reply(id, { result: await handler(params) });
  } catch (error) {
    if (error instanceof BundlerError) return fail(id, error.code, error.message);
    if (error instanceof z.ZodError) return fail(id, -32602, 'Invalid params');
    return fail(id, -32603, 'El registro está ocupado');
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
