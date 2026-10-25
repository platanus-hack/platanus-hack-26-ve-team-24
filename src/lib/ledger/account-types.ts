import type { Es256Signer } from '../credential/keys';
import type { Address, Hex, P256Jwk } from '../credential/types';

export interface TxResult {
  txHash: Hex;
  blockNumber: number;
  feeWei: '0'; // the user always pays nothing
  sponsorFeeWei: Hex; // what the sponsor's paymaster paid
  elapsedMs: number;
}
export interface AccountClient {
  readonly address: Address;
  readonly signer: Es256Signer;
  applyForAccreditation(name: string): Promise<TxResult>;
  anchor(credentialHash: Hex): Promise<TxResult>; // keyId = signer.keyId
  revoke(credentialHash: Hex): Promise<TxResult>;
  addKey(jwk: P256Jwk): Promise<TxResult>;
  removeKey(keyId: Hex): Promise<TxResult>;
  approve(issuer: Address): Promise<TxResult>; // consortium member accounts
  suspend(issuer: Address): Promise<TxResult>;
  addMember(account: Address, name: string): Promise<TxResult>; // one vote of the current quorum
}

export interface AccountClientArgs {
  signer: Es256Signer;
  account?: Address; // omit to use the counterfactual account of signer; pass it for a teammate's device
  salt?: bigint;
}

/** A write the ledger refused or could not complete: `message` is for people, `technical` for details. */
export class LedgerWriteError extends Error {
  constructor(
    message: string,
    readonly technical: string,
  ) {
    super(message);
  }
}
