import { beforeEach, describe, expect, it } from 'vitest';
import { generateSigner } from './keys';
import { fromB64u, parseJsonSegment, signJws, splitJws, toB64u } from './jws';
import { presentCredential, REVEAL_TEMPLATES } from './present';
import {
  ACCOUNT,
  DID,
  ISSUER_NAME,
  makeWorld,
  type World,
} from './test-fixtures';
import {
  verifyCertificate,
  verifyPresentation,
  type CheckCode,
  type CheckEvent,
  type CheckStatus,
  type Verdict,
  type VerifyContext,
} from './verify';

const DAY_SEC = 24 * 60 * 60;
const HOUR_MS = 60 * 60 * 1000;
const CODES: CheckCode[] = ['TOKEN', 'ISSUER', 'SIGNATURE', 'HOLDER', 'LEDGER'];

type Row = [CheckCode, CheckStatus];
type PresentArgs = Parameters<typeof presentCredential>[0];

async function collect(
  generator: AsyncGenerator<CheckEvent, Verdict>,
): Promise<{ events: CheckEvent[]; verdict: Verdict }> {
  const events: CheckEvent[] = [];
  let step = await generator.next();
  while (!step.done) {
    events.push(step.value);
    step = await generator.next();
  }
  return { events, verdict: step.value };
}

const rowsOf = (events: CheckEvent[]): Row[] => events.map(({ code, status }) => [code, status]);

const allVerified = (): Row[] => CODES.flatMap((code): Row[] => [[code, 'CHECKING'], [code, 'VERIFIED']]);

function rowsFailingAt(failed: CheckCode, status: 'FAILED' | 'UNAVAILABLE' = 'FAILED'): Row[] {
  const failedIndex = CODES.indexOf(failed);
  return CODES.flatMap((code, i): Row[] => {
    if (i < failedIndex) return [[code, 'CHECKING'], [code, 'VERIFIED']];
    if (i === failedIndex) return [[code, 'CHECKING'], [code, status]];
    return [[code, 'NOT_EXAMINED']];
  });
}

describe('verifyPresentation', () => {
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

  const verify = (input: string, ctx: Partial<VerifyContext> = {}) =>
    collect(verifyPresentation(input, { lookup: world.lookup, ...ctx }));

  it('accepts an authentic presentation with five verified checks', async () => {
    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({
      kind: 'AUTHENTIC',
      hiddenCount: 8,
      keyBound: true,
      validUntil: world.credential.validUntil,
      claims: { startDate: '2020-03-01', employedNow: true, workCountry: 'VE' },
      issuer: { did: DID, account: ACCOUNT, name: ISSUER_NAME },
    });
    expect(rowsOf(events)).toEqual(allVerified());

    const measured = events.filter((e) => e.status === 'VERIFIED').map((e) => e.measured);
    expect(measured[0]).toMatch(/^[\d.]+ bytes · 8 ocultos$/);
    expect(measured[1]).toBe(ISSUER_NAME);
    expect(measured[2]).toMatch(/^ES256 · [\d.]+ ms$/);
    expect(measured[3]).toMatch(/^clave 0x.{2}… · vinculada$/);
    expect(measured[4]).toBe('bloque 1.204');
  });

  it('fails at TOKEN when a disclosure is altered', async () => {
    const [jwt, disclosure, ...rest] = (await present()).split('~');
    const middle = Math.floor(disclosure.length / 2);
    const altered = disclosure.slice(0, middle) + (disclosure[middle] === 'A' ? 'B' : 'A') + disclosure.slice(middle + 1);

    const { events, verdict } = await verify([jwt, altered, ...rest].join('~'));

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'TOKEN' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('TOKEN'));
  });

  it('fails at SIGNATURE when the issuer JWT is re-signed by another key with the same kid', async () => {
    const attacker = (await generateSigner()).signer;
    const [header, payload] = splitJws(world.credential.issuerJwt)!;
    const forged = await signJws(parseJsonSegment(header), parseJsonSegment(payload), attacker);
    const [, ...rest] = world.credential.sdJwt.split('~');

    const { events, verdict } = await verify(
      await present({ credential: [forged, ...rest].join('~') }),
    );

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'SIGNATURE' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('SIGNATURE'));
  });

  it.each(['NONE', 'PENDING', 'SUSPENDED'] as const)('fails at ISSUER when the issuer is %s', async (status) => {
    world.setLookup({ issuer: { status } });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'ISSUER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('ISSUER'));
  });

  it('fails at ISSUER when the signing key is not registered', async () => {
    world.setLookup({ key: null });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'ISSUER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('ISSUER'));
  });

  it('fails at HOLDER when the key binding is signed by another key', async () => {
    const attacker = (await generateSigner()).signer;

    const { events, verdict } = await verify(await present({ holder: attacker }));

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'HOLDER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('HOLDER'));
  });

  it('fails at HOLDER when the nonce is not the expected one', async () => {
    const { events, verdict } = await verify(await present({ nonce: 'a-nonce' }), {
      expectNonce: 'another-nonce',
    });

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'HOLDER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('HOLDER'));
  });

  it('fails at HOLDER when the key binding has expired', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * HOUR_MS);

    const { events, verdict } = await verify(await present({ now: twoHoursAgo, ttlSec: 3600 }));

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'HOLDER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('HOLDER'));
  });

  it('fails at LEDGER when the ledger has no record', async () => {
    world.setLookup({ record: null });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'LEDGER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('LEDGER'));
  });

  it('fails at LEDGER when the certificate is revoked', async () => {
    world.setLookup({ record: { revokedAt: world.anchoredAt + 30 } });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'LEDGER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('LEDGER'));
  });

  it('fails at LEDGER when the ledger time is past validUntil', async () => {
    const validUntilSec = Date.parse(world.credential.validUntil ?? '') / 1000;
    world.setLookup({ head: { time: validUntilSec + 1 } });

    const { events, verdict } = await verify(await present({ ttlSec: 100 * DAY_SEC }));

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'LEDGER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('LEDGER'));
  });

  it('fails at LEDGER when the key was removed before the certificate was anchored', async () => {
    world.setLookup({ key: { removedAt: world.anchoredAt - 10 } });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'LEDGER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('LEDGER'));
  });

  it('fails at LEDGER when the key was added after the certificate was anchored', async () => {
    world.setLookup({ key: { addedAt: world.anchoredAt + 10 } });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'LEDGER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('LEDGER'));
  });

  it('is UNAVAILABLE at ISSUER when the ledger does not answer', async () => {
    world.setLookup({ throws: new Error('x') });

    const { events, verdict } = await verify(await present());

    expect(verdict).toMatchObject({ kind: 'UNAVAILABLE', failedAt: 'ISSUER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('ISSUER', 'UNAVAILABLE'));
  });

  it('rejects random text at TOKEN', async () => {
    const { events, verdict } = await verify('hello');

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'TOKEN' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('TOKEN'));
  });

  it('sends only issuer, keyId and credentialHash to the ledger', async () => {
    await verify(await present());

    expect(world.calls).toHaveLength(1);
    expect(Object.keys(world.calls[0])).toEqual(['issuer', 'keyId', 'credentialHash']);
    expect(world.calls[0].credentialHash).toBe(world.credential.credentialHash);
  });

  it('requires key binding by default', async () => {
    const { events, verdict } = await verify(world.credential.sdJwt);

    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: 'HOLDER' });
    expect(rowsOf(events)).toEqual(rowsFailingAt('HOLDER'));
  });
});

describe('verifyCertificate', () => {
  it('accepts an issued certificate without key binding and skips HOLDER', async () => {
    const world = await makeWorld();

    const { events, verdict } = await collect(
      verifyCertificate(world.credential.sdJwt, { lookup: world.lookup }),
    );

    expect(verdict).toMatchObject({ kind: 'AUTHENTIC', keyBound: false });
    expect(rowsOf(events)).toEqual([
      ['TOKEN', 'CHECKING'],
      ['TOKEN', 'VERIFIED'],
      ['ISSUER', 'CHECKING'],
      ['ISSUER', 'VERIFIED'],
      ['SIGNATURE', 'CHECKING'],
      ['SIGNATURE', 'VERIFIED'],
      ['HOLDER', 'NOT_EXAMINED'],
      ['LEDGER', 'CHECKING'],
      ['LEDGER', 'VERIFIED'],
    ]);
  });
});
