// Browser only: the lab's synthetic sample, published on purpose together with its holder key.
import { z } from 'zod';
import type { Sample } from '@/lib/credential/attacks';
import { generateSigner, signerFromPrivateJwk } from '@/lib/credential/keys';
import { issueCredential } from '@/lib/credential/sdjwt';
import type { EmploymentRecord, P256PrivateJwk } from '@/lib/credential/types';
import { createAccountClient } from '@/lib/ledger/account-client';
import { appUrl } from './share-builder';

const b64u = z.string().regex(/^[A-Za-z0-9_-]+$/);
const sampleSchema = z.object({
  credential: z.string().min(1),
  holderJwk: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: b64u, y: b64u, d: b64u }),
});
const identitiesSchema = z.object({
  employers: z.array(z.object({ jwk: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: b64u, y: b64u, d: b64u }) })).min(1),
});

const SYNTHETIC_RECORD: EmploymentRecord = {
  givenName: 'María Fernanda',
  familyName: 'Rojas',
  nationalId: 'V-24.567.890',
  jobTitle: 'Analista de logística',
  department: 'Operaciones',
  employmentType: 'FULL_TIME',
  startDate: '2024-02-01',
  workCountry: 'VE',
  salaryMonthlyUsd: 850,
};

export class SampleUnavailableError extends Error {}

/**
 * shortcut: without a published sample (the real ledger has not been seeded), build one from the
 * memory ledger's demo employer. Dev servers only; the dev route answers 404 in production.
 */
async function buildLocalSample(): Promise<Sample> {
  const response = await fetch('/api/dev/ledger/identities', { cache: 'no-store' });
  if (!response.ok) throw new SampleUnavailableError('La muestra de demostración aún no está publicada');
  const { employers } = identitiesSchema.parse(await response.json());
  const issuer = await signerFromPrivateJwk(employers[0]!.jwk as P256PrivateJwk);
  const client = await createAccountClient({ signer: issuer });
  const holder = await generateSigner({ extractable: true });
  const issued = await issueCredential({
    record: SYNTHETIC_RECORD,
    issuer: { did: `did:constancia:11155111:${client.address}`, keyId: issuer.keyId },
    signer: issuer,
    holderJwk: holder.signer.jwk,
    appUrl: appUrl(),
  });
  await client.anchor(issued.credentialHash);
  return {
    credential: issued.sdJwt,
    holderJwk: (await crypto.subtle.exportKey('jwk', holder.privateKey)) as P256PrivateJwk,
  };
}

export async function loadSample(): Promise<Sample> {
  const response = await fetch('/demo/sample.json', { cache: 'no-store' });
  if (response.ok) return sampleSchema.parse(await response.json());
  return buildLocalSample();
}
