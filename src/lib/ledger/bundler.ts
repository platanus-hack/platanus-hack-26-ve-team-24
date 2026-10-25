import 'server-only';

import {
  createPublicClient,
  createWalletClient,
  decodeFunctionData,
  encodePacked,
  fallback,
  http,
  parseEventLogs,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
  toPackedUserOperation,
  type UserOperation,
} from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { z } from 'zod';
import { consortiumAccountAbi, verifyingPaymasterAbi } from './abi';

// Mini bundler: trusted consortium infrastructure, no ERC-7562 validation.
// shortcut: in-process queue and op state, one relayer; upgrade to a persistent queue if we scale out.

const MAX_CALL_DATA_BYTES = 8_192;
const SPONSOR_WINDOW_SEC = 600;
const VERIFICATION_GAS = BigInt(700_000);
const VERIFICATION_GAS_WITH_DEPLOY = BigInt(2_200_000); // CREATE2 of the account + P-256 verification
const PAYMASTER_VERIFICATION_GAS = BigInt(100_000);
const FALLBACK_CALL_GAS = BigInt(500_000); // account not deployed yet, so it cannot be estimated
const MIN_CALL_GAS = BigInt(100_000);
const GAS_PATIENCE_TRIES = 5;
const GAS_PATIENCE_WAIT_MS = 12_000;
const RECEIPT_TIMEOUT_MS = 60_000;
const MAX_RESUBMITS = 2;
const FEE_BUMP_PERCENT = 125; // replacements need at least +10%
const MAX_TRACKED_OPS = 500;

export class BundlerError extends Error {
  constructor(
    message: string,
    readonly code = -32602,
  ) {
    super(message);
  }
}

/**
 * The server's own env is wrong, not the request. Kept apart from BundlerError so the route never
 * reports it as bad params: naming the variable is what makes it fixable without the process env.
 */
export class BundlerConfigError extends Error {
  constructor(readonly variables: string[]) {
    super(`Bundler is misconfigured: ${variables.join(', ')}`);
  }
}

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value as Address);
const hex = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/)
  .transform((value) => value as Hex);
const quantity = hex.transform((value) => BigInt(value === '0x' ? '0x0' : value));
const ZERO_ADDRESS = /^0x0{40}$/;

const CONFIG_SCHEMA = z.object({
  LEDGER_RPC_URL: z.url(),
  LEDGER_RPC_URL_BACKUP: optional(z.url()),
  RELAYER_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  PAYMASTER_ADDRESS: address,
  NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS: optional(address),
  LEDGER_CONTRACT_ADDRESS: optional(address),
  BUNDLER_MAX_GAS_GWEI: optional(z.coerce.number().positive()),
});

const SPONSOR_REQUEST = z.object({
  sender: address,
  factory: optional(address),
  factoryData: optional(hex),
  callData: hex,
});

const SEND_REQUEST = SPONSOR_REQUEST.extend({
  nonce: quantity,
  callGasLimit: quantity,
  verificationGasLimit: quantity,
  preVerificationGas: quantity,
  maxFeePerGas: quantity,
  maxPriorityFeePerGas: quantity,
  paymaster: address,
  paymasterVerificationGasLimit: quantity,
  paymasterPostOpGasLimit: quantity,
  paymasterData: hex,
  signature: hex,
});

type Op = UserOperation<'0.7'>;
type OpStatus =
  | { state: 'queued' }
  | { state: 'failed'; error: string }
  | { state: 'submitted'; txHash: Hex; op: Op };

function createContext() {
  const parsed = CONFIG_SCHEMA.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'environment')))];
    throw new BundlerConfigError(names);
  }
  const config = parsed.data;
  const urls = [config.LEDGER_RPC_URL, config.LEDGER_RPC_URL_BACKUP].filter((url) => url !== undefined);
  const transport = fallback(urls.map((url) => http(url)));
  const relayer = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex);
  return {
    config,
    relayer,
    client: createPublicClient({ chain: sepolia, transport }),
    wallet: createWalletClient({ account: relayer, chain: sepolia, transport }),
    maxGasWei: BigInt(Math.round((config.BUNDLER_MAX_GAS_GWEI ?? 100) * 1e9)),
  };
}

type Context = ReturnType<typeof createContext>;
const state = globalThis as typeof globalThis & {
  __bundlerCtx?: Context;
  __bundlerOps?: Map<Hex, OpStatus>;
  __bundlerTail?: Promise<unknown>;
};
const context = () => (state.__bundlerCtx ??= createContext());
const ops = () => (state.__bundlerOps ??= new Map());

function track(hash: Hex, status: OpStatus) {
  const tracked = ops();
  tracked.delete(hash);
  tracked.set(hash, status);
  if (tracked.size > MAX_TRACKED_OPS) tracked.delete(tracked.keys().next().value as Hex);
}

// Serial queue: one handleOps in flight at a time, so the relayer nonce never clashes.
function enqueue(job: () => Promise<void>) {
  const run = (state.__bundlerTail ?? Promise.resolve()).then(job);
  state.__bundlerTail = run.catch(() => undefined);
}

// Only our own accounts, our factory and our ledger: the paymaster is not a free gas faucet.
function assertSponsorable(request: z.output<typeof SPONSOR_REQUEST>, ctx: Context) {
  const { factory, callData, sender } = request;
  const configuredFactory = ctx.config.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
  if (factory && (!configuredFactory || factory.toLowerCase() !== configuredFactory.toLowerCase())) {
    throw new BundlerError('Unknown account factory');
  }
  if ((callData.length - 2) / 2 > MAX_CALL_DATA_BYTES) throw new BundlerError('Operation too large');

  const ledger = ctx.config.LEDGER_CONTRACT_ADDRESS;
  const allowed = [sender, ...(ledger && !ZERO_ADDRESS.test(ledger) ? [ledger] : [])].map((a) => a.toLowerCase());
  const { functionName, args } = decodeFunctionData({ abi: consortiumAccountAbi, data: callData });
  const targets =
    functionName === 'execute'
      ? [args[0]]
      : functionName === 'executeBatch'
        ? args[0].map((call) => call.target)
        : null;
  if (!targets || !targets.every((target) => allowed.includes(target.toLowerCase()))) {
    throw new BundlerError('This operation is not sponsored');
  }
}

async function nonceOf(ctx: Context, sender: Address) {
  return ctx.client.readContract({
    address: entryPoint07Address,
    abi: entryPoint07Abi,
    functionName: 'getNonce',
    args: [sender, BigInt(0)],
  });
}

async function gasFields(ctx: Context, request: z.output<typeof SPONSOR_REQUEST>) {
  const deployed = (await ctx.client.getCode({ address: request.sender })) !== undefined;
  let callGasLimit = FALLBACK_CALL_GAS;
  if (deployed) {
    const estimate = await ctx.client
      .estimateGas({ account: entryPoint07Address, to: request.sender, data: request.callData })
      .catch(() => undefined);
    if (estimate !== undefined) callGasLimit = (estimate * BigInt(3)) / BigInt(2) > MIN_CALL_GAS ? (estimate * BigInt(3)) / BigInt(2) : MIN_CALL_GAS;
  }
  const fees = await ctx.client.estimateFeesPerGas();
  const bytes = BigInt((request.callData.length + (request.factoryData?.length ?? 0)) / 2);
  return {
    callGasLimit,
    verificationGasLimit: request.factory ? VERIFICATION_GAS_WITH_DEPLOY : VERIFICATION_GAS,
    preVerificationGas: BigInt(60_000) + BigInt(20) * (bytes + BigInt(300)),
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  };
}

function withPaymaster(
  request: z.output<typeof SPONSOR_REQUEST>,
  nonce: bigint,
  gas: Awaited<ReturnType<typeof gasFields>>,
  paymaster: Address,
  paymasterData: Hex,
): Op {
  return {
    ...request,
    ...gas,
    nonce,
    paymaster,
    paymasterVerificationGasLimit: PAYMASTER_VERIFICATION_GAS,
    paymasterPostOpGasLimit: BigInt(0),
    paymasterData,
    signature: '0x',
  };
}

// Fills the nonce and every gas field and returns them with the sponsor's signature. The client must
// use these fields unchanged: the sponsor signed all of them.
export async function sponsorUserOperation(params: unknown) {
  const request = SPONSOR_REQUEST.parse(params);
  const ctx = context();
  assertSponsorable(request, ctx);
  const paymaster = ctx.config.PAYMASTER_ADDRESS;
  const [nonce, gas, block] = await Promise.all([
    nonceOf(ctx, request.sender),
    gasFields(ctx, request),
    ctx.client.getBlock(),
  ]);
  const validUntil = Number(block.timestamp) + SPONSOR_WINDOW_SEC;
  const validAfter = 0;
  const unsigned = withPaymaster(request, nonce, gas, paymaster, '0x');
  const hash = await ctx.client.readContract({
    address: paymaster,
    abi: verifyingPaymasterAbi,
    functionName: 'getHash',
    args: [toPackedUserOperation(unsigned), validUntil, validAfter],
  });
  const signature = await ctx.relayer.signMessage({ message: { raw: hash } });
  const paymasterData = encodePacked(['uint48', 'uint48', 'bytes'], [validUntil, validAfter, signature]);
  const sponsored = withPaymaster(request, nonce, gas, paymaster, paymasterData);
  return {
    nonce: toHex(nonce),
    callGasLimit: toHex(gas.callGasLimit),
    verificationGasLimit: toHex(gas.verificationGasLimit),
    preVerificationGas: toHex(gas.preVerificationGas),
    maxFeePerGas: toHex(gas.maxFeePerGas),
    maxPriorityFeePerGas: toHex(gas.maxPriorityFeePerGas),
    paymaster,
    paymasterVerificationGasLimit: toHex(PAYMASTER_VERIFICATION_GAS),
    paymasterPostOpGasLimit: '0x0',
    paymasterData,
    paymasterAndData: toPackedUserOperation(sponsored).paymasterAndData,
  };
}

export async function estimateUserOperationGas(params: unknown) {
  const request = SPONSOR_REQUEST.parse(params);
  const ctx = context();
  assertSponsorable(request, ctx);
  const gas = await gasFields(ctx, request);
  return {
    callGasLimit: toHex(gas.callGasLimit),
    verificationGasLimit: toHex(gas.verificationGasLimit),
    preVerificationGas: toHex(gas.preVerificationGas),
    paymasterVerificationGasLimit: toHex(PAYMASTER_VERIFICATION_GAS),
    paymasterPostOpGasLimit: '0x0',
  };
}

// Gas patience: no demo write is worth overpaying, so wait for the fee to come back under the cap.
async function waitForAffordableGas(ctx: Context) {
  for (let attempt = 0; attempt < GAS_PATIENCE_TRIES; attempt++) {
    if ((await ctx.client.getGasPrice()) <= ctx.maxGasWei) return;
    await new Promise((resolve) => setTimeout(resolve, GAS_PATIENCE_WAIT_MS));
  }
  throw new Error('Gas price is above the cap; try again later');
}

// A stuck handleOps is replaced by the same transaction at a higher fee (same relayer nonce).
// If the original got mined in the meantime the replacement is rejected and we keep waiting on it.
async function resubmitWithHigherFee(ctx: Context, request: Parameters<Context['wallet']['writeContract']>[0], stuck: Hex) {
  const tx = await ctx.client.getTransaction({ hash: stuck });
  const bump = (fee: bigint | undefined) => ((fee ?? BigInt(0)) * BigInt(FEE_BUMP_PERCENT)) / BigInt(100) + BigInt(1);
  return ctx.wallet
    .writeContract({ ...request, nonce: tx.nonce, maxFeePerGas: bump(tx.maxFeePerGas), maxPriorityFeePerGas: bump(tx.maxPriorityFeePerGas) } as never)
    .catch(() => stuck);
}

async function submit(ctx: Context, hash: Hex, op: Op) {
  try {
    await waitForAffordableGas(ctx);
    const { request } = await ctx.client.simulateContract({
      account: ctx.relayer,
      address: entryPoint07Address,
      abi: entryPoint07Abi,
      functionName: 'handleOps',
      args: [[toPackedUserOperation(op)], ctx.relayer.address],
    });
    let txHash = await ctx.wallet.writeContract(request);
    track(hash, { state: 'submitted', txHash, op });
    for (let resubmits = 0; ; resubmits++) {
      try {
        await ctx.client.waitForTransactionReceipt({ hash: txHash, timeout: RECEIPT_TIMEOUT_MS });
        return;
      } catch (error) {
        if (resubmits >= MAX_RESUBMITS) throw error;
        txHash = await resubmitWithHigherFee(ctx, request, txHash);
        track(hash, { state: 'submitted', txHash, op });
      }
    }
  } catch (error) {
    track(hash, { state: 'failed', error: error instanceof Error ? error.message.split('\n')[0] : 'failed' });
  }
}

export async function sendUserOperation(params: unknown) {
  const request = SEND_REQUEST.parse(params);
  const ctx = context();
  if (request.paymaster.toLowerCase() !== ctx.config.PAYMASTER_ADDRESS.toLowerCase()) {
    throw new BundlerError('Operations must use the consortium paymaster');
  }
  assertSponsorable(request, ctx);
  const op: Op = request;
  const hash = getUserOperationHash({
    userOperation: op,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: '0.7',
    chainId: sepolia.id,
  });
  track(hash, { state: 'queued' });
  enqueue(() => submit(ctx, hash, op));
  return hash;
}

export async function getUserOperationReceipt(hash: Hex) {
  const status = ops().get(hash);
  if (!status || status.state === 'queued') return null;
  if (status.state === 'failed') throw new BundlerError(status.error, -32500);
  const ctx = context();
  const receipt = await ctx.client.getTransactionReceipt({ hash: status.txHash }).catch(() => null);
  if (!receipt) return null;
  const event = parseEventLogs({ abi: entryPoint07Abi, logs: receipt.logs, eventName: 'UserOperationEvent' }).find(
    (log) => log.args.userOpHash === hash,
  );
  if (!event) throw new BundlerError('Operation was not included', -32500);
  return {
    userOpHash: hash,
    sender: event.args.sender,
    nonce: toHex(event.args.nonce),
    success: event.args.success,
    actualGasCost: toHex(event.args.actualGasCost),
    actualGasUsed: toHex(event.args.actualGasUsed),
    receipt: {
      transactionHash: receipt.transactionHash,
      blockNumber: toHex(receipt.blockNumber),
      status: receipt.status,
    },
  };
}

export function getUserOperationByHash(hash: Hex) {
  const status = ops().get(hash);
  return status?.state === 'submitted' ? { userOpHash: hash, transactionHash: status.txHash } : null;
}

export const supportedEntryPoints = () => [entryPoint07Address];
export const chainId = () => toHex(sepolia.id);
