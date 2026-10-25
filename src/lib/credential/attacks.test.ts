import { beforeAll, describe, expect, it } from 'vitest';
import type { IssuerInfo, KeyInfo, LookupRequest, LookupResponse, RecordInfo } from '../ledger/types';
import { runAttack, type AttackId, type Sample } from './attacks';
import { fromB64u } from './jws';
import { generateSigner, signerFromPrivateJwk } from './keys';
import { presentCredential, REVEAL_TEMPLATES } from './present';
import { issueCredential } from './sdjwt';
import { ACCOUNT, APP_URL, BLOCK_NUMBER, DID, ISSUER_NAME } from './test-fixtures';
import type { EmploymentRecord, P256PrivateJwk } from './types';
import { verifyPresentation, type CheckCode, type LookupFn, type Verdict } from './verify';

const LAB_AUDIENCE = 'Fake Letter Lab';
const TTL_SEC = 3600;
const EXPECTED_FAILURE: Record<AttackId, CheckCode> = {
  'edit-claim': 'TOKEN',
  'forge-signature': 'SIGNATURE',
  'fake-employer': 'ISSUER',
  'stolen-certificate': 'HOLDER',
};
const ATTACK_IDS = Object.keys(EXPECTED_FAILURE) as AttackId[];

const EMPLOYMENT: EmploymentRecord = {
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

interface Lab {
  sample: Sample;
  lookup: LookupFn;
}

async function buildLab(): Promise<Lab> {
  const issuer = (await generateSigner()).signer;
  const holder = await generateSigner({ extractable: true });
  const holderJwk = (await crypto.subtle.exportKey('jwk', holder.privateKey)) as P256PrivateJwk;
  const issued = await issueCredential({
    record: EMPLOYMENT,
    issuer: { did: DID, keyId: issuer.keyId },
    signer: issuer,
    holderJwk: holder.signer.jwk,
    appUrl: APP_URL,
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const addedAt = nowSec - 120;
  const anchoredAt = nowSec - 60;
  const head = { number: 1300, time: nowSec + 5 };
  const accredited: IssuerInfo = {
    account: ACCOUNT,
    name: ISSUER_NAME,
    status: 'ACTIVE',
    approvals: 3,
    quorum: 3,
    accreditedAt: addedAt,
  };
  const key: KeyInfo = { keyId: issuer.keyId, jwk: issuer.jwk, addedAt, removedAt: null };
  const record: RecordInfo = {
    credentialHash: issued.credentialHash,
    issuer: ACCOUNT,
    keyId: issuer.keyId,
    anchoredAt,
    revokedAt: null,
    blockNumber: BLOCK_NUMBER,
  };

  const lookup: LookupFn = async (req: LookupRequest): Promise<LookupResponse> => {
    if (req.issuer !== ACCOUNT) {
      const unknown: IssuerInfo = {
        account: req.issuer,
        name: 'Unknown',
        status: 'NONE',
        approvals: 0,
        quorum: 3,
        accreditedAt: null,
      };
      return { head, issuer: unknown, key: null, record: null };
    }
    const isThisCredential = req.credentialHash === issued.credentialHash;
    return { head, issuer: accredited, key, record: isThisCredential ? record : null };
  };

  return { sample: { credential: issued.sdJwt, holderJwk }, lookup };
}

async function verdictOf(presentation: string, lookup: LookupFn): Promise<Verdict> {
  const generator = verifyPresentation(presentation, { lookup });
  let step = await generator.next();
  while (!step.done) step = await generator.next();
  return step.value;
}

const disclosuresOf = (presentation: string): string[] => presentation.split('~').slice(1, -1);

const decodeDisclosure = (encoded: string): [string, string, unknown] =>
  JSON.parse(new TextDecoder().decode(fromB64u(encoded)));

describe('Fake Letter Lab attacks', () => {
  let lab: Lab;

  beforeAll(async () => {
    lab = await buildLab();
  });

  it.each(ATTACK_IDS)('%s is rejected at its own check', async (id) => {
    const { presentation, attack } = await runAttack(id, lab.sample);
    const verdict = await verdictOf(presentation, lab.lookup);

    expect(attack.expectedFailure).toBe(EXPECTED_FAILURE[id]);
    expect(verdict).toMatchObject({ kind: 'NOT_AUTHENTIC', failedAt: EXPECTED_FAILURE[id] });
  });

  it('makes each attack fail at a different check', async () => {
    const failures = new Set<CheckCode>();
    for (const id of ATTACK_IDS) {
      const { presentation } = await runAttack(id, lab.sample);
      const verdict = await verdictOf(presentation, lab.lookup);
      if (verdict.kind === 'NOT_AUTHENTIC') failures.add(verdict.failedAt);
    }

    expect(failures.size).toBe(ATTACK_IDS.length);
  });

  it.each(ATTACK_IDS)('%s describes what changed in a non-empty sentence', async (id) => {
    const { attack } = await runAttack(id, lab.sample);

    expect(attack.title.length).toBeGreaterThan(0);
    expect(attack.changed.length).toBeGreaterThan(0);
  });

  it('describes the edit-claim change with both job titles', async () => {
    const { attack } = await runAttack('edit-claim', lab.sample);

    expect(attack.changed).toBe('El cargo cambió de «Logistics Analyst» a «Director de Operaciones»');
  });

  it('leaves the untouched sample AUTHENTIC', async () => {
    const holder = await signerFromPrivateJwk(lab.sample.holderJwk);
    const presentation = await presentCredential({
      credential: lab.sample.credential,
      holder,
      reveal: REVEAL_TEMPLATES.employment,
      aud: LAB_AUDIENCE,
      ttlSec: TTL_SEC,
    });

    expect(await verdictOf(presentation, lab.lookup)).toMatchObject({ kind: 'AUTHENTIC' });
  });

  it.each(ATTACK_IDS)('%s produces a new presentation on every run', async (id) => {
    const first = await runAttack(id, lab.sample);
    const second = await runAttack(id, lab.sample);

    expect(first.presentation).not.toBe(second.presentation);
  });

  it('discloses the fake job title in the edit-claim presentation', async () => {
    const { presentation } = await runAttack('edit-claim', lab.sample);
    const jobTitles = disclosuresOf(presentation)
      .map(decodeDisclosure)
      .filter(([, name]) => name === 'jobTitle')
      .map(([, , value]) => value);

    expect(jobTitles).toEqual(['Director de Operaciones']);
  });
});
