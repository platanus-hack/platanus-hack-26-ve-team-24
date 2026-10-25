// The demo, end to end: issue a PDF -> verify it -> share only some data -> issue another -> unify.
import { describe, expect, it } from 'vitest';
import { generateHolderKey, generateSigner, signerFromPrivateJwk } from '../credential/keys';
import { verifyVerifiedCv } from '../credential/passport';
import { presentCredential } from '../credential/present';
import type { IssuedCredential } from '../credential/sdjwt';
import { issueCredential } from '../credential/sdjwt';
import type { Address, ClaimName, EmploymentRecord } from '../credential/types';
import { verifyCertificate, verifyPresentation, type LookupFn } from '../credential/verify';
import { runIssue, type IssueDeps } from '../employer/issue';
import { drainVerdict } from '../vault/drain-verdict';
import { readInputFile } from '../../app/verify/_lib/load-input';
import { readCredentialFile } from './credential-file';
import { credentialPdf, presentationPdf } from './documents';
import { buildHistory, checkSamePerson } from './join';
import { readPdfPayload } from './pdf';

const ACCOUNT: Address = '0x1f9a000000000000000000000000000000000001';
const DID = `did:constancia:11155111:${ACCOUNT}`;
const URL = 'http://localhost:3000/verify';
const nowSec = () => Math.floor(Date.now() / 1000);

const record = (over: Partial<EmploymentRecord>): EmploymentRecord => ({
  givenName: 'María Fernanda',
  familyName: 'Rojas',
  nationalId: 'V-24.567.890',
  jobTitle: 'Analista de logística',
  employmentType: 'FULL_TIME',
  startDate: '2022-02-01',
  endDate: '2023-06-30',
  workCountry: 'VE',
  salaryMonthlyUsd: 850,
  ...over,
});

async function world() {
  const issuer = (await generateSigner()).signer;
  const anchored = new Map<string, number>();
  const lookup: LookupFn = async (req) => ({
    head: { number: 10, time: nowSec() + 5 },
    issuer: {
      account: ACCOUNT,
      name: 'Empresa Demo A',
      status: 'ACTIVE',
      approvals: 2,
      quorum: 2,
      accreditedAt: nowSec() - 500,
    },
    key: { keyId: issuer.keyId, jwk: issuer.jwk, addedAt: nowSec() - 400, removedAt: null },
    record: anchored.has(req.credentialHash)
      ? {
          credentialHash: req.credentialHash,
          issuer: ACCOUNT,
          keyId: issuer.keyId,
          anchoredAt: anchored.get(req.credentialHash)!,
          revokedAt: null,
          blockNumber: 11,
        }
      : null,
  });
  const deps = (): IssueDeps => ({
    newHolderKey: generateHolderKey,
    sign: (rec, holder) =>
      issueCredential({
        record: rec,
        issuer: { did: DID, keyId: issuer.keyId },
        signer: issuer,
        holderJwk: holder,
        appUrl: 'http://localhost:3000',
      }),
    anchor: async (hash) => {
      anchored.set(hash, nowSec() - 100);
      return { blockNumber: 11 } as never;
    },
    packageCredential: (credential: IssuedCredential, holderKey) =>
      credentialPdf({ credential, holderKey, issuerName: 'Empresa Demo A', verifyUrl: URL }),
    record: async () => undefined,
  });
  const issue = async (rec: EmploymentRecord) => {
    const progress = await runIssue({ record: rec }, deps(), {}, () => undefined);
    return new File([progress.pdf as BlobPart], 'c.pdf', { type: 'application/pdf' });
  };
  return { lookup, issue };
}

describe('the demo flow', () => {
  it('issues a PDF, verifies it, shares part of it and unifies two credentials', async () => {
    const { lookup, issue } = await world();

    // 1-2: the employer's form produces a PDF that verifies
    const first = await issue(record({}));
    const credential = await readCredentialFile(first);
    const full = await drainVerdict(verifyCertificate(credential.sdJwt, { lookup }));
    expect(full.kind).toBe('AUTHENTIC');
    if (full.kind === 'AUTHENTIC') {
      expect(full.hiddenCount).toBe(0);
      expect(full.claims.salaryMonthlyUsd).toBe(850);
    }

    // the verifier page reads the full file with its own key, so the Titular check really runs
    const fileRun = verifyPresentation(await readInputFile(first), { lookup });
    const statuses: Record<string, string> = {};
    let fileStep = await fileRun.next();
    while (!fileStep.done) {
      statuses[fileStep.value.code] = fileStep.value.status;
      fileStep = await fileRun.next();
    }
    expect(fileStep.value.kind).toBe('AUTHENTIC');
    expect(statuses.HOLDER).toBe('VERIFIED');

    // 3: selective disclosure: only the salary band and employment dates
    const reveal: ClaimName[] = ['salaryBand', 'startDate', 'endDate', 'employedNow'];
    const presentation = await presentCredential({
      credential: credential.sdJwt,
      holder: await signerFromPrivateJwk(credential.holderKey),
      reveal,
      aud: 'Banco Demo',
      ttlSec: 3600,
    });
    const shared = await presentationPdf({ presentation, aud: 'Banco Demo', verifyUrl: URL });
    const sharedPayload = await readPdfPayload(shared);
    expect(sharedPayload?.type).toBe('presentation');
    const verdict = await drainVerdict(
      verifyPresentation(sharedPayload?.type === 'presentation' ? sharedPayload.presentation : '', {
        lookup,
      }),
    );
    expect(verdict.kind).toBe('AUTHENTIC');
    if (verdict.kind === 'AUTHENTIC') {
      expect(Object.keys(verdict.claims).toSorted()).toEqual([...reveal].toSorted());
      expect(verdict.claims.salaryBand).toBe('600-1000');
      expect(verdict.hiddenCount).toBe(Object.keys(credential.claims).length - reveal.length);
    }
    // what stayed hidden is not in the file, not even encoded
    const shownText = new TextDecoder('latin1').decode(shared);
    expect(shownText).not.toContain('Analista');
    expect(shownText).not.toContain('V-24.567.890');

    // 4-5: a second credential for the same person, then the history
    const second = await issue(
      record({ jobTitle: 'Coordinadora', startDate: '2023-08-01', endDate: undefined }),
    );
    const files = [credential, await readCredentialFile(second)];
    expect(checkSamePerson(files).ok).toBe(true);
    const { pdf, entries } = await buildHistory({
      files: files.map((file) => ({ file, employer: 'Empresa Demo A' })),
      reveal: ['givenName', 'familyName', 'jobTitle', 'startDate', 'endDate', 'employedNow'],
      aud: 'Banco Demo',
      ttlSec: 3600,
      verifyUrl: URL,
    });
    expect(entries).toBe(2);
    const history = await readPdfPayload(pdf);
    expect(history?.type).toBe('cv');
    const run = verifyVerifiedCv(history?.type === 'cv' ? history.cv : '', { lookup });
    let step = await run.next();
    while (!step.done) step = await run.next();
    expect(step.value.kind).toBe('AUTHENTIC');
    if (step.value.kind === 'AUTHENTIC') {
      expect(step.value.entries).toHaveLength(2);
      expect(step.value.timeline.items.map((item) => item.jobTitle)).toEqual([
        'Analista de logística',
        'Coordinadora',
      ]);
    }
  });

  it('refuses to unify two different people', async () => {
    const { issue } = await world();
    const a = await readCredentialFile(await issue(record({})));
    const b = await readCredentialFile(
      await issue(record({ nationalId: 'V-11.111.111', givenName: 'Luis' })),
    );
    expect(checkSamePerson([a, b]).ok).toBe(false);
  });
});
