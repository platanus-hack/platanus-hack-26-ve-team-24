import { describe, expect, test } from 'vitest';
import { generateSigner, signerFromPrivateJwk } from '../credential/keys';
import { createMemoryAccountClient, type MemoryTransport } from './account-client-memory';
import { conformanceCases, type ConformanceWorld } from './conformance';
import { buildDidDocument, parseDid } from './did';
import { MemoryLedger } from './memory';
import { LedgerOpError } from './memory-ops';
import roster from './members.json';

async function bootWorld(): Promise<ConformanceWorld> {
  let now = 1_800_000_000;
  const ledger = new MemoryLedger(() => (now += 5)); // every read of the clock moves time on
  const { members } = await ledger.seed();
  const transport: MemoryTransport = (op) => ledger.execute(op);
  const clientFor: ConformanceWorld['clientFor'] = async (signer, account) =>
    createMemoryAccountClient({ signer, account }, transport);
  const memberClients = await Promise.all(
    members.map(async (member) => clientFor(await signerFromPrivateJwk(member.jwk))),
  );
  return { reader: ledger.reader(), clientFor, members: memberClients, quorum: ledger.quorum };
}

describe('memory ledger conformance', () => {
  for (const { name, run } of conformanceCases) {
    test(name, async () => {
      await run(await bootWorld());
    });
  }
});

describe('memory ledger specifics', () => {
  test('boots the consortium roster and three accredited employers', async () => {
    const ledger = new MemoryLedger();
    await ledger.seed();
    const state = ledger.state();
    expect(state.members).toHaveLength(roster.members.length);
    expect(state.members).toHaveLength(6);
    expect(state.issuers.map((issuer) => issuer.status)).toEqual(['ACTIVE', 'ACTIVE', 'ACTIVE']);
    expect(state.chainId).toBe(11155111);
    expect(state.blockTimeSec).toBe(12);
  });

  test('a replayed signed op is refused', async () => {
    const ledger = new MemoryLedger();
    await ledger.seed();
    const { signer } = await generateSigner();
    let captured: Parameters<MemoryTransport>[0] | undefined;
    const client = createMemoryAccountClient({ signer }, (op) => {
      captured = op;
      return ledger.execute(op);
    });
    await client.applyForAccreditation('Replay Co');
    await expect(ledger.execute(captured!)).rejects.toBeInstanceOf(LedgerOpError);
  });

  test('a tampered payload is refused', async () => {
    const ledger = new MemoryLedger();
    await ledger.seed();
    const { signer } = await generateSigner();
    const tampered = JSON.stringify({ method: 'applyForAccreditation', name: 'Other' });
    const client = createMemoryAccountClient({ signer }, (op) =>
      ledger.execute({ ...op, payload: tampered }),
    );
    await expect(client.applyForAccreditation('Honest')).rejects.toThrow();
  });
});

describe('did', () => {
  test('parses and builds a document with live keys only', () => {
    const did = 'did:constancia:11155111:0x1f9a000000000000000000000000000000000001';
    expect(parseDid(did)?.chainId).toBe(11155111);
    expect(parseDid('did:web:example.com')).toBeNull();
    const jwk = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' } as const;
    const doc = buildDidDocument(
      did,
      { account: '0x1', name: 'Acme', status: 'ACTIVE', approvals: 2, quorum: 2, accreditedAt: 1 },
      [
        { keyId: '0xaa', jwk, addedAt: 1, removedAt: null },
        { keyId: '0xbb', jwk, addedAt: 1, removedAt: 5 },
      ],
    );
    expect(doc.assertionMethod).toEqual([`${did}#0xaa`]);
    expect(doc.didDocumentMetadata).toEqual({ accredited: true, name: 'Acme' });
  });
});
