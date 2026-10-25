import { decodePresentation, TokenError } from '@/lib/credential/present';
import type { P256Jwk } from '@/lib/credential/types';
import type { Verdict } from '@/lib/credential/verify';
import type { PolledRequest } from './requests-client';
import { RequestGoneError } from './requests-client';
import type { VaultStore } from './store';
import type { VaultCertificate, VaultRequest } from './types';

/** The delivery can never be stored: the holder must ask again. */
export class RejectedError extends Error {}

export interface ReceiveDeps {
  store: VaultStore;
  getRequest(id: string): Promise<PolledRequest>;
  ackRequest(id: string): Promise<void>;
  decrypt(jwe: string, privateKey: CryptoKey): Promise<string>;
  loadSigner(name: string): Promise<{ jwk: P256Jwk } | null>;
  verify(sdJwt: string): Promise<Verdict>;
  now?: () => number;
}

const sameKey = (a: P256Jwk, b: unknown) =>
  typeof b === 'object' && b !== null && (b as P256Jwk).x === a.x && (b as P256Jwk).y === a.y;

function boundKeyOf(sdJwt: string): unknown {
  try {
    return (decodePresentation(sdJwt).payload.cnf as { jwk?: unknown } | undefined)?.jwk;
  } catch (caught) {
    if (caught instanceof TokenError) throw new RejectedError(caught.message);
    throw caught;
  }
}

async function receiveDelivery(
  deps: ReceiveDeps,
  request: VaultRequest,
  jwe: string,
): Promise<void> {
  if (!request.encPrivateKey) throw new RejectedError('Falta la clave de esta solicitud');
  const sdJwt = await deps.decrypt(jwe, request.encPrivateKey);

  const signer = await deps.loadSigner(request.keyName);
  if (!signer || !sameKey(signer.jwk, boundKeyOf(sdJwt))) {
    throw new RejectedError('Esta constancia no está ligada a tu clave');
  }

  const verdict = await deps.verify(sdJwt);
  if (verdict.kind === 'UNAVAILABLE') throw new Error(verdict.reason);
  if (verdict.kind === 'NOT_AUTHENTIC') throw new RejectedError(verdict.reason);

  await deps.store.putCertificate({
    id: verdict.record.credentialHash,
    sdJwt,
    credentialHash: verdict.record.credentialHash,
    employer: verdict.issuer.account,
    employerName: verdict.issuer.name,
    kind: request.kind,
    keyName: request.keyName,
    receivedAt: (deps.now ?? Date.now)(),
  } satisfies VaultCertificate);
  await deps.ackRequest(request.id);
  await deps.store.deleteRequest(request.id); // drops the ECDH key with it
}

/** One poll of one pending request: update its status or store what was delivered. */
export async function syncRequest(deps: ReceiveDeps, request: VaultRequest): Promise<void> {
  let polled: PolledRequest;
  try {
    polled = await deps.getRequest(request.id);
  } catch (caught) {
    if (caught instanceof RequestGoneError) await deps.store.deleteRequest(request.id);
    return; // any other failure: keep waiting, the next poll tries again
  }

  if (polled.status === 'EXPIRED') return deps.store.deleteRequest(request.id);
  if (polled.status === 'DECLINED') {
    return deps.store.putRequest({ ...request, status: 'DECLINED' });
  }
  if (polled.status !== 'ISSUED' || !polled.delivery) return;

  try {
    await receiveDelivery(deps, request, polled.delivery);
  } catch (caught) {
    const rejected = caught instanceof RejectedError;
    await deps.store.putRequest({
      ...request,
      status: rejected ? 'REJECTED' : request.status,
      error: rejected ? caught.message : 'Aún no se pudo abrir la entrega. Lo intentamos de nuevo.',
    });
  }
}
