import { describe, expect, it } from 'vitest';
import { buildVerifiedCv } from '@/lib/credential/passport';
import { openShare, sealShare } from '@/lib/credential/share-crypto';
import { makeWorld } from '@/lib/credential/test-fixtures';
import type { ClaimName } from '@/lib/credential/types';
import { createCv, defaultReveal, previewTimeline, revealsName, type CvFlowDeps, type CvSelection } from './cv-builder';
import { timelineItems, type CvEntry } from './cv-entries';

async function selection(reveal?: ClaimName[]): Promise<{ selection: CvSelection; holder: Awaited<ReturnType<typeof makeWorld>>['holderSigner']; world: Awaited<ReturnType<typeof makeWorld>> }> {
  const world = await makeWorld();
  const entry: CvEntry = {
    id: world.credential.credentialHash,
    sdJwt: world.credential.sdJwt,
    keyName: `cert:${world.credential.credentialHash}`,
    employer: 'Empresa Demo A',
    status: 'VERIFIED',
  };
  return { selection: { entry, reveal: reveal ?? defaultReveal(entry) }, holder: world.holderSigner, world };
}

describe('createCv', () => {
  it('passes buildVerifiedCv exactly the selected entries and fields, and returns a fragment link', async () => {
    const first = await selection(['jobTitle', 'startDate', 'employedNow']);
    const second = await selection(['givenName']);
    const holders = new Map([
      [first.selection.entry.keyName!, first.holder],
      [second.selection.entry.keyName!, second.holder],
    ]);
    const built: Parameters<CvFlowDeps['buildCv']>[0][] = [];
    const sent: string[] = [];
    const deps: CvFlowDeps = {
      loadSigner: async (name) => holders.get(name) ?? null,
      buildCv: (args) => {
        built.push(args);
        return buildVerifiedCv(args);
      },
      seal: sealShare,
      postShare: async (ciphertext) => {
        sent.push(ciphertext);
        return { id: 'e'.repeat(32), expiresAt: '2030-01-01T00:00:00Z' };
      },
      appUrl: 'https://constancia.example',
    };

    const created = await createCv(deps, { selections: [first.selection, second.selection], aud: 'Banco Demo', ttlSec: 3600 });

    expect(built[0]!.items.map((item) => item.reveal)).toEqual([['jobTitle', 'startDate', 'employedNow'], ['givenName']]);
    expect(built[0]!.items.map((item) => item.credential)).toEqual([first.selection.entry.sdJwt, second.selection.entry.sdJwt]);
    expect(created.link).toMatch(/^https:\/\/constancia\.example\/verify#s=[0-9a-f]{32}\.[A-Za-z0-9_-]+$/);
    expect(sent).toHaveLength(1);
    expect(await openShare(sent[0]!, created.link.split('.').at(-1)!)).toBe(created.presentation);
    expect(JSON.parse(created.presentation).presentations).toHaveLength(2);
  });

  it('refuses an empty CV and an entry whose key is missing', async () => {
    const { selection: one } = await selection();
    const deps: CvFlowDeps = {
      loadSigner: async () => null,
      buildCv: buildVerifiedCv,
      seal: sealShare,
      postShare: async () => ({ id: 'e'.repeat(32), expiresAt: '' }),
      appUrl: 'https://x.example',
    };
    await expect(createCv(deps, { selections: [], aud: 'a', ttlSec: 3600 })).rejects.toThrow();
    await expect(createCv(deps, { selections: [one], aud: 'a', ttlSec: 3600 })).rejects.toThrow(/clave/);
  });
});

describe('preview', () => {
  it('shows only chosen fields and parks entries with hidden dates last', async () => {
    const dated = await selection(['jobTitle', 'startDate', 'employedNow']);
    const undated = await selection(['jobTitle']);
    const timeline = previewTimeline([undated.selection, dated.selection]);
    const items = timelineItems(timeline);
    expect(items.map((item) => item.id)).toEqual([dated.selection.entry.id, undated.selection.entry.id]);
    expect(items[0]).toMatchObject({ title: 'Logistics Analyst', start: '2020-03-01', end: 'actualidad' });
    expect(items[1]).toMatchObject({ note: 'fechas ocultas', start: undefined });
    expect(revealsName([dated.selection, undated.selection])).toBe(false);
    expect(revealsName([{ ...dated.selection, reveal: ['familyName'] }])).toBe(true);
  });
});
