// A2 debt, memory half: the verifier, the Lab attacks and a revocation against the memory ledger
// behind the real gateway lookup. The same flow on Sepolia waits for public/demo/sample.json.
import { describe, expect, test } from 'vitest';
import { runAttack, type AttackId } from '../credential/attacks';
import { generateSigner, signerFromPrivateJwk } from '../credential/keys';
import { presentCredential, REVEAL_TEMPLATES } from '../credential/present';
import { credentialHashOf, issueCredential } from '../credential/sdjwt';
import type { P256PrivateJwk } from '../credential/types';
import { verifyPresentation, type Verdict } from '../credential/verify';
import { createMemoryAccountClient } from './account-client-memory';
import { lookup } from './gateway';
import { MemoryLedger } from './memory';

async function drain(events: ReturnType<typeof verifyPresentation>): Promise<Verdict> {
  for (;;) {
    const step = await events.next();
    if (step.done) return step.value;
  }
}

async function boot() {
  const ledger = new MemoryLedger();
  const { members } = await ledger.seed();
  const reader = ledger.reader();
  const transport = (op: Parameters<MemoryLedger['execute']>[0]) => ledger.execute(op);
  const memberClients = await Promise.all(
    members.map(async (m) =>
      createMemoryAccountClient({ signer: await signerFromPrivateJwk(m.jwk) }, transport),
    ),
  );

  const issuer = await generateSigner();
  const employer = createMemoryAccountClient({ signer: issuer.signer }, transport);
  await employer.applyForAccreditation('Orinoco Logistics (demo)');
  for (const member of memberClients.slice(0, ledger.quorum)) await member.approve(employer.address);

  const holder = await generateSigner({ extractable: true });
  const holderJwk = (await crypto.subtle.exportKey('jwk', holder.privateKey)) as P256PrivateJwk;
  const issued = await issueCredential({
    record: {
      givenName: 'María',
      familyName: 'Rojas',
      nationalId: 'V-24.567.890',
      jobTitle: 'Logistics Analyst',
      employmentType: 'FULL_TIME',
      startDate: '2020-03-01',
      workCountry: 'VE',
    },
    issuer: { did: `did:constancia:11155111:${employer.address}`, keyId: issuer.signer.keyId },
    signer: issuer.signer,
    holderJwk: holder.signer.jwk,
    appUrl: 'http://localhost:3000',
  });
  await employer.anchor(credentialHashOf(issued.issuerJwt));

  const verify = (presentation: string) =>
    drain(verifyPresentation(presentation, { lookup: (req) => lookup(reader, req) }));
  return { employer, holder: holder.signer, holderJwk, issued, verify };
}

describe('verifier against the memory ledger', () => {
  test('an anchored certificate is AUTHENTIC, and a revocation turns the ledger check red', async () => {
    const { employer, holder, issued, verify } = await boot();
    const presentation = await presentCredential({
      credential: issued.sdJwt,
      holder,
      reveal: REVEAL_TEMPLATES.employment,
      aud: 'Banco Demo',
      ttlSec: 3600,
    });
    expect((await verify(presentation)).kind).toBe('AUTHENTIC');

    await employer.revoke(credentialHashOf(issued.issuerJwt));
    const revoked = await verify(presentation);
    expect(revoked).toMatchObject({
      kind: 'NOT_AUTHENTIC',
      failedAt: 'LEDGER',
      reason: 'El empleador revocó esta constancia',
    });
  });

  test.each([
    ['edit-claim', 'TOKEN'],
    ['forge-signature', 'SIGNATURE'],
    ['fake-employer', 'ISSUER'],
    ['stolen-certificate', 'HOLDER'],
  ] as [AttackId, string][])('the %s attack stops at %s', async (id, failedAt) => {
    const { holderJwk, issued, verify } = await boot();
    const { presentation } = await runAttack(id, { credential: issued.sdJwt, holderJwk });
    expect(await verify(presentation)).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt });
  });
});
