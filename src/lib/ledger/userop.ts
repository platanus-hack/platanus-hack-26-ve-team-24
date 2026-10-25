// ERC-4337 v0.7 UserOperation plumbing over the app's bundler route. Isomorphic: viem only.
import { hexToBytes, toHex, type Address, type Hex } from 'viem';
import { entryPoint07Address, getUserOperationHash } from 'viem/account-abstraction';
import type { Es256Signer } from '../credential/keys';

const RECEIPT_TIMEOUT_MS = 90_000; // must outlast the bundler's own 60 s receipt wait, or we give up on an op it is still resubmitting
const POLL_MS = 3000;
const QUANTITY_FIELDS = [
  'nonce',
  'callGasLimit',
  'verificationGasLimit',
  'preVerificationGas',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'paymasterVerificationGasLimit',
  'paymasterPostOpGasLimit',
] as const;
type QuantityField = (typeof QUANTITY_FIELDS)[number];

export interface SponsorRequest {
  sender: Address;
  factory?: Address;
  factoryData?: Hex;
  callData: Hex;
}
/** What the bundler returns: everything the sponsor signed, to be used unchanged. */
type SponsorResponse = Record<QuantityField, Hex> & { paymaster: Address; paymasterData: Hex };
export interface UserOperation extends SponsorRequest, Record<QuantityField, bigint> {
  paymaster: Address;
  paymasterData: Hex;
  signature: Hex;
}
export interface OperationReceipt {
  success: boolean;
  actualGasCost: Hex;
  receipt: { transactionHash: Hex; blockNumber: Hex };
}

/** A failure the bundler or the network reported; `message` is the technical text. */
export class BundlerRpcError extends Error {}

// Browsers use the same origin; Node scripts need the app URL (or an explicit BUNDLER_URL).
function bundlerUrl(): string {
  if (typeof window !== 'undefined') return '/api/bundler';
  return (
    process.env.BUNDLER_URL ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/bundler`
  );
}

export async function bundlerRpc<T>(method: string, params: unknown[]): Promise<T> {
  let response: Response;
  try {
    response = await fetch(bundlerUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
  } catch (error) {
    throw new BundlerRpcError(`${method}: network error (${String(error)})`);
  }
  if (response.status === 429) throw new BundlerRpcError(`${method}: rate limited`);
  const body = (await response.json().catch(() => null)) as {
    result?: T;
    error?: { message?: string } | string;
  } | null;
  // A proxy, a crash or a non-JSON error page must never read as a successful call: without this,
  // the caller gets `undefined` and fails later with a TypeError that names nothing.
  if (!response.ok) throw new BundlerRpcError(`${method}: the bundler answered ${response.status}`);
  if (body === null) throw new BundlerRpcError(`${method}: the bundler sent no reply`);
  if (body.error !== undefined) {
    const detail = typeof body.error === 'string' ? body.error : body.error.message;
    throw new BundlerRpcError(`${method}: ${detail ?? 'unknown error'}`);
  }
  if (!('result' in body)) throw new BundlerRpcError(`${method}: the bundler sent no result`);
  return body.result as T;
}

export async function sponsor(request: SponsorRequest): Promise<UserOperation> {
  const fields = await bundlerRpc<SponsorResponse>('eth_sponsorUserOperation', [request]);
  const quantities = Object.fromEntries(
    QUANTITY_FIELDS.map((field) => [field, BigInt(fields[field])]),
  ) as Record<QuantityField, bigint>;
  return {
    ...request,
    ...quantities,
    paymaster: fields.paymaster,
    paymasterData: fields.paymasterData,
    signature: '0x',
  };
}

/** Signature layout: keyId (32) | r (32) | s (32), over the userOpHash that WebCrypto hashes with SHA-256. */
export async function signOperation(
  operation: UserOperation,
  signer: Es256Signer,
  chainId: number,
): Promise<{ operation: UserOperation; hash: Hex }> {
  const hash = getUserOperationHash({
    userOperation: operation as never,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: '0.7',
    chainId,
  });
  const rs = await signer.sign(hexToBytes(hash));
  const signature = `${signer.keyId}${toHex(rs).slice(2)}` as Hex;
  return { operation: { ...operation, signature }, hash };
}

const toWire = (operation: UserOperation) =>
  Object.fromEntries(
    Object.entries(operation).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? toHex(value) : value,
    ]),
  );

export async function submitAndWait(
  operation: UserOperation,
  hash: Hex,
): Promise<OperationReceipt> {
  await bundlerRpc('eth_sendUserOperation', [toWire(operation)]);
  const started = Date.now();
  while (Date.now() - started < RECEIPT_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const receipt = await bundlerRpc<OperationReceipt | null>('eth_getUserOperationReceipt', [hash]);
    if (!receipt) continue;
    if (!receipt.success) {
      throw new BundlerRpcError(`reverted on chain (tx ${receipt.receipt.transactionHash})`);
    }
    return receipt;
  }
  throw new BundlerRpcError('not confirmed within 90 s');
}
