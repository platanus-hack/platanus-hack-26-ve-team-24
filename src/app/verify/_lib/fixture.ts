// TEMP: sample + fake ledger until A3-S2 (POST /api/ledger/lookup) and A4-S1 (shares) land. Delete with its callers.
import type { LookupFn } from '@/lib/credential/verify';
import type { LookupRequest } from '@/lib/ledger/types';
import { inputFromText } from './load-input';
import type { LoadedInput } from './types';

const ACCOUNT = '0x1f9a000000000000000000000000000000000001';
const ISSUER_NAME = 'Empresa Demo A';
const BLOCK_NUMBER = 1204;

export async function makeSample(): Promise<{ input: LoadedInput; lookup: LookupFn }> {
  const [{ generateSigner }, { issueCredential }, { presentCredential, REVEAL_TEMPLATES }] =
    await Promise.all([
      import('@/lib/credential/keys'),
      import('@/lib/credential/sdjwt'),
      import('@/lib/credential/present'),
    ]);

  const issuer = await generateSigner();
  const holder = await generateSigner();
  const did = `did:constancia:24024:${ACCOUNT}`;

  const issued = await issueCredential({
    record: {
      givenName: 'María Fernanda',
      familyName: 'Rojas',
      nationalId: 'V-24.567.890',
      jobTitle: 'Analista de Logística',
      department: 'Operaciones',
      employmentType: 'FULL_TIME',
      startDate: '2020-03-01',
      workCountry: 'VE',
      salaryMonthlyUsd: 850,
    },
    issuer: { did, keyId: issuer.signer.keyId },
    signer: issuer.signer,
    holderJwk: holder.signer.jwk,
    appUrl: window.location.origin,
  });

  const presentation = await presentCredential({
    credential: issued.sdJwt,
    holder: holder.signer,
    reveal: REVEAL_TEMPLATES.income,
    aud: 'Banco Demo',
    ttlSec: 3600,
  });

  const now = Math.floor(Date.now() / 1000);
  const lookup: LookupFn = async (req: LookupRequest) => ({
    head: { number: 1300, time: now + 5 },
    issuer: {
      account: ACCOUNT,
      name: ISSUER_NAME,
      status: 'ACTIVE',
      approvals: 3,
      quorum: 3,
      accreditedAt: now - 1000,
    },
    key: {
      keyId: issuer.signer.keyId,
      jwk: issuer.signer.jwk,
      addedAt: now - 120,
      removedAt: null,
    },
    record:
      req.credentialHash === issued.credentialHash
        ? {
            credentialHash: issued.credentialHash,
            issuer: ACCOUNT,
            keyId: issuer.signer.keyId,
            anchoredAt: now - 60,
            revokedAt: null,
            blockNumber: BLOCK_NUMBER,
          }
        : null,
  });

  return { input: inputFromText(presentation, 'sample'), lookup };
}
