import { toB64u } from '../credential/jws';
import type { Address, Hex } from '../credential/types';
import { memoryAccountAddress } from './account-address';
import {
  LedgerOpError,
  opMessage,
  type LedgerErrorCode,
  type MemoryCall,
  type SignedOp,
} from './memory-ops';
import {
  LedgerWriteError,
  type AccountClient,
  type AccountClientArgs,
  type TxResult,
} from './account-types';

export type MemoryTransport = (op: SignedOp) => Promise<{ txHash: Hex; blockNumber: number }>;

const OP_PATH = '/api/dev/ledger/op';

const HUMAN_MESSAGES: Partial<Record<LedgerErrorCode, string>> = {
  NOT_AUTHORIZED: 'Tu clave de firma no está autorizada en esta cuenta',
  NOT_MEMBER: 'Solo un miembro del consorcio puede hacer eso',
  ALREADY_VOTED: 'Este miembro ya votó',
  WRONG_STATUS: 'El registro no lo permite en el estado actual',
  KEY_NOT_LIVE: 'Esa clave de firma no está activa en esta cuenta',
  ALREADY_EXISTS: 'Esta constancia ya está en el registro',
  NOT_FOUND: 'El registro no tiene esa constancia',
  ALREADY_REVOKED: 'Esta constancia ya fue revocada',
};

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Default transport: the dev route that runs the op on the server's memory ledger. */
const postOp: MemoryTransport = async (op) => {
  const response = await fetch(OP_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(op),
  });
  const body = (await response.json()) as { error?: LedgerErrorCode; txHash: Hex; blockNumber: number };
  if (!response.ok) throw new LedgerOpError(body.error ?? 'NOT_AUTHORIZED');
  return body;
};

export function createMemoryAccountClient(
  { signer, account, salt = BigInt(0) }: AccountClientArgs,
  transport: MemoryTransport = postOp,
): AccountClient {
  const address: Address = account ?? memoryAccountAddress(signer.jwk, salt);

  async function send(call: MemoryCall): Promise<TxResult> {
    const started = Date.now();
    const payload = JSON.stringify(call);
    const nonce = randomHex(16);
    const signature = toB64u(await signer.sign(opMessage(address, nonce, payload)));
    try {
      const receipt = await transport({
        account: address,
        keyId: signer.keyId,
        jwk: signer.jwk,
        salt: salt.toString(),
        nonce,
        payload,
        signature,
      });
      return { ...receipt, feeWei: '0', sponsorFeeWei: '0x0', elapsedMs: Date.now() - started };
    } catch (error) {
      if (!(error instanceof LedgerOpError)) throw error;
      throw new LedgerWriteError(HUMAN_MESSAGES[error.code] ?? 'El registro rechazó la operación', error.code);
    }
  }

  return {
    address,
    signer,
    applyForAccreditation: (name) => send({ method: 'applyForAccreditation', name }),
    anchor: (credentialHash) => send({ method: 'anchor', credentialHash, keyId: signer.keyId }),
    revoke: (credentialHash) => send({ method: 'revoke', credentialHash }),
    addKey: (jwk) => send({ method: 'addKey', jwk }),
    removeKey: (keyId) => send({ method: 'removeKey', keyId }),
    approve: (issuer) => send({ method: 'approve', issuer }),
    suspend: (issuer) => send({ method: 'suspend', issuer }),
  };
}
