import 'server-only';
import { verifyEs256 } from '../credential/keys';
import { fromB64u, utf8 } from '../credential/jws';
import type { Address, Hex } from '../credential/types';
import { getLedgerReader } from '../ledger/reader';
import { LedgerUnreachableError } from '../ledger/types';
import type { KeyInfo } from '../ledger/types';
import { HttpError } from './http';
import { createChallenge, createSessionToken, readChallenge } from './session';

/** The key must exist on the ledger and not be removed; a PENDING account may still sign in. */
async function liveKey(account: Address, keyId: Hex): Promise<KeyInfo | null> {
  try {
    const key = await getLedgerReader().key(account, keyId);
    return key && key.removedAt === null ? key : null;
  } catch (error) {
    if (error instanceof LedgerUnreachableError) {
      throw new HttpError(503, 'LEDGER_UNREACHABLE', 'El registro no responde en este momento');
    }
    throw error;
  }
}

export async function startChallenge(account: Address, keyId: Hex): Promise<string> {
  if (!(await liveKey(account, keyId))) throw new HttpError(404, 'KEY_UNKNOWN', 'Esta clave de firma no está registrada');
  return createChallenge({ account, keyId });
}

/** Verifies the ES256 signature of the challenge string and returns the session token. */
export async function finishChallenge(challenge: string, signature: string): Promise<{ account: Address; token: string }> {
  const bad = new HttpError(401, 'BAD_SIGNATURE', 'La firma no coincide');
  const who = await readChallenge(challenge);
  if (!who) throw bad;
  const key = await liveKey(who.account, who.keyId);
  if (!key) throw bad;
  let valid = false;
  try {
    valid = await verifyEs256(key.jwk, utf8(challenge), fromB64u(signature));
  } catch {
    valid = false;
  }
  if (!valid) throw bad;
  return { account: who.account, token: await createSessionToken(who) };
}
