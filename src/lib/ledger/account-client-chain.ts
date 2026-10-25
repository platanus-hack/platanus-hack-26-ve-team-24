// Chain implementation of the AccountClient: sponsored UserOps through the app's bundler.
import { encodeFunctionData, type Address, type Hex } from 'viem';
import type { P256Jwk } from '../credential/types';
import { clientEnv } from '../env';
import { accountFactoryAbi, consortiumAccountAbi, ledgerAbi } from './abi';
import { jwkCoordinates } from './account-address';
import {
  LedgerWriteError,
  type AccountClient,
  type AccountClientArgs,
  type TxResult,
} from './account-types';
import { BundlerRpcError, signOperation, sponsor, submitAndWait } from './userop';

const NONCE_RETRY_DELAY_MS = 3000;
const ZERO = BigInt(0);

interface AccountLookup {
  address: Address;
  deployed: boolean;
  ledger: Address;
}

// Browsers go through the app origin; Node scripts need the app URL.
const appBase = () =>
  typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

/** The gateway knows the counterfactual address, whether it is deployed, and the Ledger's address. */
async function lookupAccount(jwk: P256Jwk, salt: bigint): Promise<AccountLookup> {
  const query = new URLSearchParams({ x: jwk.x, y: jwk.y, salt: salt.toString() });
  const response = await fetch(`${appBase()}/api/ledger/account?${query}`).catch(() => null);
  if (!response?.ok) {
    // A 4xx means this device's key was refused; anything else is the server's fault. Calling both
    // "the ledger is busy" told people to retry a request that could never succeed.
    const status = response?.status;
    throw new LedgerWriteError(
      status !== undefined && status >= 400 && status < 500
        ? 'This device could not prove its account'
        : 'The ledger is busy, try again in a moment',
      `account lookup failed (${status ?? 'no reply'})`,
    );
  }
  return (await response.json()) as AccountLookup;
}

// Technical text from the bundler or the EntryPoint becomes a sentence a person can act on.
// Every EntryPoint error code names a different broken piece; collapsing them into one sentence
// is what made a missing paymaster deposit look like a rejected application.
function explain(error: BundlerRpcError): LedgerWriteError {
  const technical = error.message;
  const human = /AA31|deposit too low/i.test(technical)
    ? 'The consortium paymaster is out of gas money'
    : /AA33|reverted/i.test(technical)
      ? 'The ledger rejected the operation'
      : /AA21|prefund/i.test(technical)
        ? 'This account has no funds for gas'
        : /AA25|nonce/i.test(technical)
          ? 'Two operations from this device collided'
          : /AA34|paymaster signature/i.test(technical)
            ? 'The consortium paymaster rejected this operation'
            : /AA24|invalid signature|signature error/i.test(technical)
              ? 'Your signing key is not an owner of this account'
              : /gas price|above the cap/i.test(technical)
                ? 'The network is expensive right now, try again in a few minutes'
                : /rate limited/i.test(technical)
                  ? 'Too many requests, wait a moment and try again'
                  : /network error|not confirmed/i.test(technical)
                    ? 'The ledger is busy, try again in a moment'
                    : 'The ledger did not accept that';
  return new LedgerWriteError(human, technical);
}

const isNonceClash = (error: unknown) => error instanceof Error && /AA25|nonce/i.test(error.message);

export async function createChainAccountClient({
  signer,
  account,
  salt = ZERO,
}: AccountClientArgs): Promise<AccountClient> {
  const { NEXT_PUBLIC_LEDGER_CHAIN_ID: chainId, NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS: factory } =
    clientEnv();
  const own = await lookupAccount(signer.jwk, salt);
  const address = account ?? own.address;
  const ledger = own.ledger;
  // initCode rides on the first op, and only when this device's own counterfactual account sends it
  let deployed = own.deployed || address.toLowerCase() !== own.address.toLowerCase();

  const ledgerCall = (functionName: string, args: unknown[]) =>
    encodeFunctionData({ abi: ledgerAbi, functionName, args } as never);
  const accountCall = (functionName: string, args: unknown[]) =>
    encodeFunctionData({ abi: consortiumAccountAbi, functionName, args } as never);
  const execute = (target: Address, data: Hex) => accountCall('execute', [target, ZERO, data]);

  async function attempt(callData: Hex): Promise<TxResult> {
    const started = Date.now();
    const { x, y } = jwkCoordinates(signer.jwk);
    const unsigned = await sponsor({
      sender: address,
      callData,
      ...(!deployed && {
        factory,
        factoryData: encodeFunctionData({
          abi: accountFactoryAbi,
          functionName: 'createAccount',
          args: [x, y, salt],
        }),
      }),
    });
    const { operation, hash } = await signOperation(unsigned, signer, chainId);
    const receipt = await submitAndWait(operation, hash);
    deployed = true;
    return {
      txHash: receipt.receipt.transactionHash,
      blockNumber: Number(BigInt(receipt.receipt.blockNumber)),
      feeWei: '0',
      sponsorFeeWei: receipt.actualGasCost,
      elapsedMs: Date.now() - started,
    };
  }

  // One retry on a nonce clash (two ops of the same account racing), re-sponsored from scratch.
  async function send(callData: Hex): Promise<TxResult> {
    try {
      return await attempt(callData);
    } catch (first) {
      try {
        if (!isNonceClash(first)) throw first;
        await new Promise((resolve) => setTimeout(resolve, NONCE_RETRY_DELAY_MS));
        return await attempt(callData);
      } catch (error) {
        throw error instanceof BundlerRpcError ? explain(error) : error;
      }
    }
  }

  return {
    address,
    signer,
    applyForAccreditation: (name) =>
      send(execute(ledger, ledgerCall('applyForAccreditation', [name]))),
    anchor: (credentialHash) =>
      send(execute(ledger, ledgerCall('anchor', [credentialHash, signer.keyId]))),
    revoke: (credentialHash) => send(execute(ledger, ledgerCall('revoke', [credentialHash]))),
    addKey: (jwk) => {
      const { x, y } = jwkCoordinates(jwk);
      return send(execute(address, accountCall('addOwner', [x, y])));
    },
    removeKey: (keyId) => send(execute(address, accountCall('removeOwner', [keyId]))),
    approve: (issuer) => send(execute(ledger, ledgerCall('approve', [issuer]))),
    suspend: (issuer) => send(execute(ledger, ledgerCall('suspend', [issuer]))),
  };
}
