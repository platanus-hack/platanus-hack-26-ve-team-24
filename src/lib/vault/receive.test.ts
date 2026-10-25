import { describe, expect, it } from 'vitest';
import { generateSigner } from '@/lib/credential/keys';
import { decryptFromIssuer, encryptForHolder, generateEncKey } from '@/lib/credential/share-crypto';
import { makeWorld } from '@/lib/credential/test-fixtures';
import { verifyCertificate } from '@/lib/credential/verify';
import { drainVerdict } from './drain-verdict';
import { syncRequest, type ReceiveDeps } from './receive';
import { createMemoryStore } from './store';
import type { VaultRequest } from './types';

async function setup(opts: { boundTo?: 'holder' | 'someone-else'; garbleDelivery?: boolean } = {}) {
  const world = await makeWorld();
  const enc = await generateEncKey();
  const stranger = (await generateSigner()).signer;
  const jwe = opts.garbleDelivery
    ? 'not.a.jwe'
    : await encryptForHolder(world.credential.sdJwt, enc.jwk);
  const store = createMemoryStore();
  const acked: string[] = [];
  const request: VaultRequest = {
    id: 'a'.repeat(32),
    employer: world.account,
    employeeRef: 'E-1',
    kind: 'CURRENT',
    keyName: 'cert:test',
    createdAt: 1,
    status: 'PENDING',
    encPrivateKey: enc.privateKey,
  };
  await store.putRequest(request);
  const deps: ReceiveDeps = {
    store,
    getRequest: async () => ({ status: 'ISSUED', delivery: jwe }),
    ackRequest: async (id) => void acked.push(id),
    decrypt: decryptFromIssuer,
    loadSigner: async () => (opts.boundTo === 'someone-else' ? stranger : world.holderSigner),
    verify: (sdJwt) => drainVerdict(verifyCertificate(sdJwt, { lookup: world.lookup })),
  };
  return { deps, store, request, acked, world };
}

describe('syncRequest', () => {
  it('stores a good delivery, acks it and drops the request with its key', async () => {
    const { deps, store, request, acked, world } = await setup();
    await syncRequest(deps, request);
    const [certificate] = await store.listCertificates();
    expect(certificate).toMatchObject({
      id: world.credential.credentialHash,
      employerName: 'Empresa Demo A',
      kind: 'CURRENT',
    });
    expect(acked).toEqual([request.id]);
    expect(await store.getRequest(request.id)).toBeUndefined();
  });

  it('rejects a certificate bound to another key', async () => {
    const { deps, store, request, acked } = await setup({ boundTo: 'someone-else' });
    await syncRequest(deps, request);
    expect(await store.listCertificates()).toHaveLength(0);
    expect(acked).toHaveLength(0);
    expect(await store.getRequest(request.id)).toMatchObject({
      status: 'REJECTED',
      error: 'Esta constancia no está ligada a tu clave',
    });
  });

  it('leaves the request pending with an error when decryption fails', async () => {
    const { deps, store, request } = await setup({ garbleDelivery: true });
    await syncRequest(deps, request);
    expect(await store.listCertificates()).toHaveLength(0);
    const kept = await store.getRequest(request.id);
    expect(kept?.status).toBe('PENDING');
    expect(kept?.error).toBeTruthy();
  });

  it('records a decline', async () => {
    const { deps, store, request } = await setup();
    await syncRequest({ ...deps, getRequest: async () => ({ status: 'DECLINED', delivery: null }) }, request);
    expect((await store.getRequest(request.id))?.status).toBe('DECLINED');
  });
});
