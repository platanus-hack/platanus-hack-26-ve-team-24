// LedgerReader over viem: reads the Sepolia Ledger and the consortium accounts.
import { BaseError, HttpRequestError, LimitExceededRpcError, TimeoutError, WebSocketRequestError, hexToBytes, type Abi } from 'viem';
import { toB64u } from '../credential/jws';
import type { Address, Hex, P256Jwk } from '../credential/types';
import { jwkCoordinates } from './account-address';
import { accountFactoryAbi, consortiumAccountAbi, ledgerAbi } from './abi';
import {
  LedgerUnreachableError,
  type Head,
  type IssuerInfo,
  type IssuerStatus,
  type KeyInfo,
  type LedgerReader,
  type NetworkState,
  type RecordInfo,
} from './types';

export const CHAIN_ID = 11155111;
export const BLOCK_TIME_SEC = 12;
const RECENT_BLOCKS = 16;
const RECENT_ANCHORS = 10;
const LOG_CHUNK_BLOCKS = BigInt(10_000);
const MIN_LOG_CHUNK_BLOCKS = BigInt(10);
const MAX_LOG_REQUESTS = 40;
const STATE_TTL_MS = 5000;
const STATUSES: IssuerStatus[] = ['NONE', 'PENDING', 'ACTIVE', 'SUSPENDED'];

/** The slice of viem's public client the reader needs (a fake in tests). */
export interface ChainClient {
  readContract(args: {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
  getBlock(args?: { blockNumber?: bigint }): Promise<{
    number: bigint;
    timestamp: bigint;
    transactions: readonly unknown[];
  }>;
  getCode(args: { address: Address }): Promise<Hex | undefined>;
  getContractEvents(args: {
    address: Address;
    abi: Abi;
    eventName: string;
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<{ blockNumber: bigint; args: unknown }[]>;
}

export interface ChainConfig {
  ledger: Address;
  factory: Address;
  deployBlock: number;
}

// --- pure mapping helpers ---

const toNumber = (value: bigint | number): number => Number(value);
const orNull = (value: bigint | number): number | null => (toNumber(value) === 0 ? null : toNumber(value));

/** The account contract stores owners as raw 32-byte coordinates; the JWK is their base64url. */
export function jwkFromCoordinates(x: Hex, y: Hex): P256Jwk {
  return { kty: 'EC', crv: 'P-256', x: toB64u(hexToBytes(x)), y: toB64u(hexToBytes(y)) };
}

interface RawIssuer {
  name: string;
  status: number;
  appliedAt: bigint;
  accreditedAt: bigint;
  approvals: number;
}

export function toIssuerInfo(account: Address, raw: RawIssuer, quorum: number): IssuerInfo {
  return {
    account,
    name: raw.name,
    status: STATUSES[raw.status] ?? 'NONE',
    approvals: raw.approvals,
    quorum,
    accreditedAt: orNull(raw.accreditedAt),
  };
}

interface RawRecord {
  anchoredAt: bigint;
  revokedAt: bigint;
  keyId: Hex;
  blockNumber: bigint;
}

export function toRecordInfo(issuer: Address, credentialHash: Hex, raw: RawRecord): RecordInfo | null {
  if (toNumber(raw.anchoredAt) === 0) return null;
  return {
    credentialHash,
    issuer,
    keyId: raw.keyId,
    anchoredAt: toNumber(raw.anchoredAt),
    revokedAt: orNull(raw.revokedAt),
    blockNumber: toNumber(raw.blockNumber),
  };
}

export function toKeyInfo(keyId: Hex, [x, y, addedAt, removedAt]: readonly [Hex, Hex, bigint, bigint]): KeyInfo | null {
  if (toNumber(addedAt) === 0) return null;
  return { keyId, jwk: jwkFromCoordinates(x, y), addedAt: toNumber(addedAt), removedAt: orNull(removedAt) };
}

// --- the reader ---

// A transport failure is the RPC being unreachable. A revert, a decode failure or a bug is not:
// wrapping those too made every contract-level fault indistinguishable from a network outage.
const isTransportFailure = (error: unknown): boolean =>
  error instanceof BaseError &&
  error.walk(
    (cause) =>
      cause instanceof HttpRequestError ||
      cause instanceof TimeoutError ||
      cause instanceof WebSocketRequestError ||
      cause instanceof LimitExceededRpcError,
  ) !== null;

async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    throw new LedgerUnreachableError('El registro no respondió', { cause: error });
  }
}

export function createChainReader(client: ChainClient, config: ChainConfig): LedgerReader {
  const { ledger, factory } = config;
  const readLedger = <T>(functionName: string, args?: readonly unknown[]) =>
    client.readContract({ address: ledger, abi: ledgerAbi as Abi, functionName, args }) as Promise<T>;
  const readAccount = <T>(account: Address, functionName: string, args?: readonly unknown[]) =>
    client.readContract({ address: account, abi: consortiumAccountAbi as Abi, functionName, args }) as Promise<T>;

  const isDeployed = async (account: Address) => (await client.getCode({ address: account })) !== undefined;

  const head = async (): Promise<Head> => {
    const block = await client.getBlock();
    return { number: toNumber(block.number), time: toNumber(block.timestamp) };
  };

  const quorum = async () => toNumber(await readLedger<number>('quorum'));

  const issuer = async (account: Address) => {
    const [raw, quorumValue] = await Promise.all([readLedger<RawIssuer>('issuerOf', [account]), quorum()]);
    return toIssuerInfo(account, raw, quorumValue);
  };

  const keyOf = async (account: Address, keyId: Hex) =>
    toKeyInfo(keyId, await readAccount<readonly [Hex, Hex, bigint, bigint]>(account, 'ownerInfo', [keyId]));

  const keys = async (account: Address): Promise<KeyInfo[]> => {
    if (!(await isDeployed(account))) return [];
    const ids = await readAccount<readonly Hex[]>(account, 'ownerIds');
    const found = await Promise.all(ids.map((id) => keyOf(account, id)));
    return found.filter((key): key is KeyInfo => key !== null);
  };

  async function recentAnchors(headNumber: number) {
    const found: { blockNumber: bigint; args: { issuer: Address; credentialHash: Hex } }[] = [];
    const floor = BigInt(config.deployBlock);
    let to = BigInt(headNumber);
    let chunk = LOG_CHUNK_BLOCKS;
    for (let requests = 0; to >= floor && found.length < RECENT_ANCHORS && requests < MAX_LOG_REQUESTS; requests++) {
      const from = to - chunk + BigInt(1) > floor ? to - chunk + BigInt(1) : floor;
      try {
        const logs = await client.getContractEvents({
          address: ledger,
          abi: ledgerAbi as Abi,
          eventName: 'CredentialAnchored',
          fromBlock: from,
          toBlock: to,
        });
        found.unshift(...(logs as typeof found));
        to = from - BigInt(1);
      } catch (error) {
        // some providers cap the block range of a log query: retry with a smaller window
        if (chunk <= MIN_LOG_CHUNK_BLOCKS) throw error;
        chunk = chunk / BigInt(10) < MIN_LOG_CHUNK_BLOCKS ? MIN_LOG_CHUNK_BLOCKS : chunk / BigInt(10);
      }
    }
    return found.slice(-RECENT_ANCHORS).reverse();
  }

  async function state(): Promise<NetworkState> {
    const latest = await head();
    const [[memberAccounts, memberNames], issuerAccounts, quorumValue, anchorLogs] = await Promise.all([
      readLedger<readonly [readonly Address[], readonly string[]]>('members'),
      readLedger<readonly Address[]>('issuerList'),
      quorum(),
      recentAnchors(latest.number),
    ]);
    const first = latest.number - RECENT_BLOCKS + 1;
    const [issuers, blocks, anchorBlocks] = await Promise.all([
      Promise.all(
        issuerAccounts.map(async (account) =>
          toIssuerInfo(account, await readLedger<RawIssuer>('issuerOf', [account]), quorumValue),
        ),
      ),
      Promise.all(
        Array.from({ length: RECENT_BLOCKS }, async (_, index) => {
          const block = await client.getBlock({ blockNumber: BigInt(first + index) });
          return { number: toNumber(block.number), time: toNumber(block.timestamp), txCount: block.transactions.length };
        }),
      ),
      Promise.all(anchorLogs.map((log) => client.getBlock({ blockNumber: log.blockNumber }))),
    ]);
    return {
      chainId: CHAIN_ID,
      head: latest,
      blockTimeSec: BLOCK_TIME_SEC,
      quorum: quorumValue,
      members: memberAccounts.map((account, index) => ({
        account: account.toLowerCase() as Address,
        name: memberNames[index] ?? '',
      })),
      issuers: issuers.map((info) => ({ ...info, account: info.account.toLowerCase() as Address })),
      blocks,
      anchors: anchorLogs.map((log, index) => ({
        credentialHash: log.args.credentialHash,
        issuer: log.args.issuer.toLowerCase() as Address,
        blockNumber: toNumber(log.blockNumber),
        time: toNumber(anchorBlocks[index]!.timestamp),
      })),
    };
  }

  // Several viewers of /ledger share one answer per few seconds (a block takes 12 s anyway).
  let cached: { at: number; value: Promise<NetworkState> } | undefined;
  const cachedState = () => {
    if (!cached || Date.now() - cached.at > STATE_TTL_MS) {
      const value = guard(state);
      cached = { at: Date.now(), value };
      value.catch(() => {
        if (cached?.value === value) cached = undefined;
      });
    }
    return cached.value;
  };

  return {
    head: () => guard(head),
    issuer: (account) => guard(() => issuer(account.toLowerCase() as Address)),
    key: (account, keyId) =>
      guard(async () => ((await isDeployed(account)) ? keyOf(account, keyId) : null)),
    keys: (account) => guard(() => keys(account)),
    record: (account, credentialHash) =>
      guard(async () =>
        toRecordInfo(
          account,
          credentialHash,
          await readLedger<RawRecord>('recordOf', [account, credentialHash]),
        ),
      ),
    state: cachedState,
    accountAddress: (jwk, salt = BigInt(0)) =>
      guard(async () => {
        const { x, y } = jwkCoordinates(jwk);
        const address = await client.readContract({
          address: factory,
          abi: accountFactoryAbi as Abi,
          functionName: 'getAddress',
          args: [x, y, salt],
        });
        return (address as Address).toLowerCase() as Address;
      }),
    isDeployed: (account) => guard(() => isDeployed(account)),
  };
}
