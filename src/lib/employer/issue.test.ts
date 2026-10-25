import { describe, expect, it } from 'vitest';
import type { IssuedCredential } from '../credential/sdjwt';
import { LedgerWriteError } from '../ledger/account-types';
import { DEMO_DIRECTORY } from './directory';
import { IssueFailure, runIssue, type IssueDeps, type IssueProgress, type IssueRequest, type StepEvent } from './issue';

const jwk = { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) } as const;
const request: IssueRequest = { id: 'a'.repeat(32), employeeRef: 'E-1042', kind: 'CURRENT', signJwk: jwk, encJwk: jwk };
const record = DEMO_DIRECTORY[0]!.record;
const credential = {
  sdJwt: 'jwt~d1~',
  issuerJwt: 'jwt',
  credentialHash: `0x${'4b'.repeat(32)}`,
  keyId: `0x${'9c'.repeat(32)}`,
} as IssuedCredential;

function harness(overrides: Partial<IssueDeps> = {}) {
  const calls: string[] = [];
  const deps: IssueDeps = {
    sign: async () => (calls.push('sign'), credential),
    anchor: async () => (calls.push('anchor'), { blockNumber: 1204 } as never),
    encrypt: async () => (calls.push('encrypt'), 'jwe-ciphertext'),
    deliver: async () => void calls.push('deliver'),
    record: async () => void calls.push('record'),
    discard: () => void calls.push('discard'),
    ...overrides,
  };
  const events: StepEvent[] = [];
  const run = (progress: IssueProgress) => runIssue({ request, record }, deps, progress, (e) => events.push(e));
  return { calls, events, run };
}

describe('runIssue', () => {
  it('signs, anchors, delivers, then discards, in that order', async () => {
    const { calls, run, events } = harness();
    const progress = await run({});
    expect(calls).toEqual(['sign', 'anchor', 'encrypt', 'deliver', 'record', 'discard']);
    expect(progress.finished).toBe(true);
    expect(events.filter((e) => e.status === 'DONE').map((e) => e.step)).toEqual([
      'OPENED', 'SIGNED', 'ANCHORED', 'DELIVERED', 'DISCARDED',
    ]);
    expect(events.find((e) => e.step === 'ANCHORED' && e.status === 'DONE')?.measured).toMatch(/1[.,]204/);
  });

  it('delivers nothing when anchoring fails, and the retry resumes at the anchor', async () => {
    let failAnchor = true;
    const { calls, run, events } = harness({
      anchor: async () => {
        calls.push('anchor');
        if (failAnchor) throw new LedgerWriteError('El registro está ocupado', 'network error');
        return { blockNumber: 7 } as never;
      },
    });
    const progress: IssueProgress = {};
    await expect(run(progress)).rejects.toMatchObject({ step: 'ANCHORED' });
    expect(calls).not.toContain('deliver');
    expect(events.at(-1)).toMatchObject({ step: 'ANCHORED', status: 'FAILED', detail: 'El registro está ocupado' });

    failAnchor = false;
    await run(progress);
    expect(calls.filter((c) => c === 'sign')).toHaveLength(1);
    expect(calls.indexOf('anchor', calls.indexOf('anchor') + 1)).toBeLessThan(calls.indexOf('deliver'));
    expect(progress.finished).toBe(true);
  });

  it('retries only the delivery when it fails, reusing the same ciphertext', async () => {
    let failDelivery = true;
    const { calls, run } = harness({
      deliver: async () => {
        calls.push('deliver');
        if (failDelivery) throw new Error('offline');
      },
    });
    const progress: IssueProgress = {};
    await expect(run(progress)).rejects.toBeInstanceOf(IssueFailure);
    failDelivery = false;
    await run(progress);
    expect(calls.filter((c) => c === 'sign' || c === 'anchor' || c === 'encrypt')).toEqual(['sign', 'anchor', 'encrypt']);
    expect(calls.filter((c) => c === 'deliver')).toHaveLength(2);
  });

  it('counts an already-anchored hash as success', async () => {
    const { run } = harness({
      anchor: async () => {
        throw new LedgerWriteError('This certificate is already on the ledger', 'ALREADY_EXISTS');
      },
    });
    const progress = await run({});
    expect(progress.anchor).toEqual({ blockNumber: null });
    expect(progress.finished).toBe(true);
  });

  it('clears state exactly once even when run again after finishing', async () => {
    const { calls, run } = harness();
    const progress: IssueProgress = {};
    await run(progress);
    await run(progress);
    expect(calls.filter((c) => c === 'discard')).toHaveLength(1);
    expect(calls.filter((c) => c === 'deliver')).toHaveLength(1);
  });
});
