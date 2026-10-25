import { describe, expect, it } from 'vitest';
import { makeWorld } from '@/lib/credential/test-fixtures';
import { verifyCertificate } from '@/lib/credential/verify';
import {
  addEntry,
  attachCertificate,
  canJoin,
  ENTRY_ROW_STATUS,
  timelineItems,
  timelineOf,
  type AttachDeps,
} from './cv-entries';
import { drainVerdict } from './drain-verdict';

async function setup() {
  const world = await makeWorld();
  const deps = (ownsKey: boolean): AttachDeps => ({
    findKeyName: async () => (ownsKey ? 'cert:mine' : null),
    verify: (sdJwt) => drainVerdict(verifyCertificate(sdJwt, { lookup: world.lookup })),
  });
  return { world, deps };
}

describe('attachCertificate', () => {
  it('verifies a certificate that is bound to a key in this vault', async () => {
    const { world, deps } = await setup();
    const entry = await attachCertificate(deps(true), world.credential.sdJwt);
    expect(entry).toMatchObject({
      status: 'VERIFIED',
      employer: 'Empresa Demo A',
      jobTitle: 'Logistics Analyst',
      keyName: 'cert:mine',
    });
    expect(canJoin(entry)).toBe(true);
  });

  it('excludes a certificate issued to a different vault', async () => {
    const { world, deps } = await setup();
    const entry = await attachCertificate(deps(false), world.credential.sdJwt);
    expect(entry.status).toBe('UNBOUND');
    expect(entry.reason).toMatch(/otra bóveda/);
    expect(canJoin(entry)).toBe(false);
    expect(timelineOf([entry]).items).toHaveLength(0);
  });

  it('names the failed check when the ledger says no', async () => {
    const { world, deps } = await setup();
    world.setLookup({ record: { revokedAt: 1 } });
    const entry = await attachCertificate(deps(true), world.credential.sdJwt);
    expect(entry).toMatchObject({ status: 'FAILED', failedAt: 'LEDGER' });
  });

  it('maps an unreachable ledger to UNAVAILABLE and rejects text that is no certificate', async () => {
    const { world, deps } = await setup();
    world.setLookup({ throws: new Error('down') });
    expect((await attachCertificate(deps(true), world.credential.sdJwt)).status).toBe('UNAVAILABLE');
    const bad = await attachCertificate(deps(true), 'hello');
    expect(bad.status).toBe('FAILED');
    expect(ENTRY_ROW_STATUS.UNBOUND).toBe('FAILED');
  });
});

describe('attaching several files', () => {
  it('collapses a duplicate and keeps the timeline to verified entries', async () => {
    const first = await setup();
    const second = await setup();
    const a = await attachCertificate(first.deps(true), first.world.credential.sdJwt);
    const b = await attachCertificate(second.deps(true), second.world.credential.sdJwt);
    const again = await attachCertificate(first.deps(true), first.world.credential.sdJwt);
    const entries = [a, b, again].reduce(addEntry, []);
    expect(entries).toHaveLength(2);
    expect(timelineItems(timelineOf(entries))).toHaveLength(2);
  });
});
