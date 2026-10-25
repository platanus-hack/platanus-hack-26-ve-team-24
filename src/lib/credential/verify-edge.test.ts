import { beforeEach, describe, expect, it } from 'vitest';
import { parseJsonSegment, signJws, splitJws } from './jws';
import { presentCredential, REVEAL_TEMPLATES } from './present';
import { issueCredential, type IssuedCredential } from './sdjwt';
import { APP_URL, DID, makeWorld, type World } from './test-fixtures';
import type { EmploymentRecord } from './types';
import {
  verifyPresentation,
  type CheckEvent,
  type LookupFn,
  type Verdict,
  type VerifyContext,
} from './verify';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_SEC = 24 * 60 * 60;

const RECORD: EmploymentRecord = {
  givenName: 'María Fernanda',
  familyName: 'Rojas',
  nationalId: 'V-24.567.890',
  jobTitle: 'Logistics Analyst',
  department: 'Operations',
  employmentType: 'FULL_TIME',
  startDate: '2020-03-01',
  workCountry: 'VE',
  salaryMonthlyUsd: 1250,
};

type PresentArgs = Parameters<typeof presentCredential>[0];

async function drain(generator: AsyncGenerator<CheckEvent, Verdict>): Promise<Verdict> {
  let step = await generator.next();
  while (!step.done) step = await generator.next();
  return step.value;
}

describe('verifyPresentation edge cases', () => {
  let world: World;

  beforeEach(async () => {
    world = await makeWorld();
  });

  const present = (overrides: Partial<PresentArgs> = {}): Promise<string> =>
    presentCredential({
      credential: world.credential.sdJwt,
      holder: world.holderSigner,
      reveal: REVEAL_TEMPLATES.employment,
      aud: 'Banco Demo',
      ttlSec: 3600,
      ...overrides,
    });

  const verifyWith = (input: string, lookup: LookupFn, ctx: Partial<VerifyContext> = {}) =>
    drain(verifyPresentation(input, { lookup, ...ctx }));

  const verify = (input: string, ctx: Partial<VerifyContext> = {}) =>
    verifyWith(input, world.lookup, ctx);

  async function reissueIssuerJwt(edit: {
    header?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }): Promise<string> {
    const [header, payload] = splitJws(world.credential.issuerJwt)!;
    const issuerJwt = await signJws(
      { ...parseJsonSegment(header), ...edit.header },
      { ...parseJsonSegment(payload), ...edit.payload },
      world.issuerSigner,
    );
    const [, ...disclosures] = world.credential.sdJwt.split('~');
    return [issuerJwt, ...disclosures].join('~');
  }

  async function expectTokenRejection(input: string, reason: RegExp): Promise<void> {
    const verdict = await verify(input);

    expect(verdict).toMatchObject({
      kind: 'NOT_AUTHENTIC',
      failedAt: 'TOKEN',
      reason: expect.stringMatching(reason),
    });
    expect(world.calls).toHaveLength(0);
  }

  it('rejects input over 256 KB at TOKEN without asking the ledger', async () => {
    await expectTokenRejection('a'.repeat(262145), /256 KB/);
  });

  it('rejects an empty string at TOKEN without asking the ledger', async () => {
    await expectTokenRejection('', /Nada que verificar/);
  });

  it('rejects whitespace-only input at TOKEN without asking the ledger', async () => {
    await expectTokenRejection(' \n\t  ', /Nada que verificar/);
  });

  it('rejects a non-string input at TOKEN without asking the ledger', async () => {
    await expectTokenRejection(123 as unknown as string, /Nada que verificar/);
  });

  it('rejects a re-signed issuer JWT with a wrong header typ at TOKEN', async () => {
    const credential = await reissueIssuerJwt({ header: { typ: 'JWT' } });

    await expectTokenRejection(await present({ credential }), /no es el de una constancia/);
  });

  it('rejects a re-signed issuer JWT with an unknown vocabulary at TOKEN', async () => {
    const credential = await reissueIssuerJwt({
      payload: {
        '@context': ['https://www.w3.org/ns/credentials/v2', 'https://evil.example/x.jsonld'],
      },
    });

    await expectTokenRejection(await present({ credential }), /vocabulario desconocido/);
  });

  it('rejects an issuer JWT dated in the future at LEDGER', async () => {
    const future = await futureCredential(world, HOUR_MS);
    const input = await present({ credential: future.sdJwt });

    const verdict = await verifyWith(input, anchoredLikeWorld(world));

    expect(verdict).toMatchObject({
      kind: 'NOT_AUTHENTIC',
      failedAt: 'LEDGER',
      reason: expect.stringMatching(/fecha futura/),
    });
  });

  it('accepts the same future-dated issuer JWT when maxSkewSec is 7200', async () => {
    const future = await futureCredential(world, HOUR_MS);
    const input = await present({ credential: future.sdJwt });

    const verdict = await verifyWith(input, anchoredLikeWorld(world), { maxSkewSec: 7200 });

    expect(verdict).toMatchObject({ kind: 'AUTHENTIC' });
  });

  it('fails at HOLDER when the key binding iat is an hour in the future', async () => {
    const input = await present({ now: new Date(Date.now() + HOUR_MS), ttlSec: 7200 });

    const verdict = await verify(input);

    expect(verdict).toMatchObject({
      kind: 'NOT_AUTHENTIC',
      failedAt: 'HOLDER',
      reason: expect.stringMatching(/fecha futura/),
    });
  });

  it('accepts a key binding iat two minutes ahead, within the skew', async () => {
    const input = await present({ now: new Date(Date.now() + 2 * MINUTE_MS) });

    const verdict = await verify(input);

    expect(verdict).toMatchObject({ kind: 'AUTHENTIC' });
  });

  it('fails at LEDGER when validUntil is in the past', async () => {
    const validUntilSec = Date.parse(world.credential.validUntil ?? '') / 1000;
    world.setLookup({ head: { time: validUntilSec + 1 } });

    const verdict = await verify(await present({ ttlSec: 100 * DAY_SEC }));

    expect(verdict).toMatchObject({
      kind: 'NOT_AUTHENTIC',
      failedAt: 'LEDGER',
      reason: expect.stringMatching(/venció/),
    });
  });
});

function futureCredential(world: World, offsetMs: number): Promise<IssuedCredential> {
  return issueCredential({
    record: RECORD,
    issuer: { did: DID, keyId: world.issuerSigner.keyId },
    signer: world.issuerSigner,
    holderJwk: world.holderSigner.jwk,
    appUrl: APP_URL,
    now: new Date(Date.now() + offsetMs),
  });
}

// The fixture world only anchors its own certificate, so the future one reuses that anchor.
function anchoredLikeWorld(world: World): LookupFn {
  return (req) => world.lookup({ ...req, credentialHash: world.credential.credentialHash });
}
