// Demo mode only: each entry of demo-pack/vault.json is a certificate and its holder key.
import { z } from 'zod';
import { importStoredSigner } from '@/lib/credential/keystore';
import { decodePresentation } from '@/lib/credential/present';
import { credentialHashOf } from '@/lib/credential/sdjwt';
import type { P256PrivateJwk } from '@/lib/credential/types';
import { verifyInVault, vaultStore } from './browser';

const b64u = z.string().regex(/^[A-Za-z0-9_-]+$/);
const packSchema = z.array(
  z.object({
    sdJwt: z.string().min(1),
    holderPrivateJwk: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: b64u, y: b64u, d: b64u }),
  }),
);

export async function importDemoPack(json: string): Promise<number> {
  const entries = packSchema.parse(JSON.parse(json));
  for (const { sdJwt, holderPrivateJwk } of entries) {
    const hash = credentialHashOf(decodePresentation(sdJwt).issuerJwt);
    const keyName = `cert:${hash}`;
    await importStoredSigner(keyName, holderPrivateJwk satisfies P256PrivateJwk);
    const verdict = await verifyInVault(sdJwt);
    await vaultStore().putCertificate({
      id: hash,
      sdJwt,
      credentialHash: hash,
      employer: verdict.kind === 'AUTHENTIC' ? verdict.issuer.account : '',
      employerName: verdict.kind === 'AUTHENTIC' ? verdict.issuer.name : 'Empleador de demostración (ficticio)',
      kind: decodePresentation(sdJwt).claims.employedNow === true ? 'CURRENT' : 'PAST',
      keyName,
      receivedAt: Date.now(),
    });
  }
  return entries.length;
}
