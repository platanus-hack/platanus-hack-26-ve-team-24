// Reusable conformance suite: the memory ledger and the chain client must pass the same cases.
// Plain async functions that throw on failure, so vitest and scripts can both run them.
import { generateSigner, type Es256Signer } from '../credential/keys';
import type { Address, Hex } from '../credential/types';
import type { AccountClient } from './account-types';
import type { LedgerReader } from './types';

export interface ConformanceWorld {
  reader: LedgerReader;
  clientFor(signer: Es256Signer, account?: Address): Promise<AccountClient>;
  members: AccountClient[]; // at least `quorum` member clients
  quorum: number;
}

export interface ConformanceCase {
  name: string;
  run(world: ConformanceWorld): Promise<void>;
}

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`conformance: ${message}`);
}

async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(`conformance: ${message}`);
}

const randomHash = (): Hex =>
  `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')}`;

async function newEmployer(world: ConformanceWorld, name: string) {
  const { signer } = await generateSigner();
  const client = await world.clientFor(signer);
  return { signer, client, account: client.address as Address, name };
}

async function accredit(world: ConformanceWorld, name: string) {
  const employer = await newEmployer(world, name);
  await employer.client.applyForAccreditation(name);
  for (const member of world.members.slice(0, world.quorum)) await member.approve(employer.account);
  return employer;
}

export const conformanceCases: ConformanceCase[] = [
  {
    name: 'an application waits for quorum, one vote per member',
    async run(world) {
      const employer = await newEmployer(world, 'Conformance Pending');
      await employer.client.applyForAccreditation(employer.name);
      await rejects(
        () => employer.client.applyForAccreditation(employer.name),
        'a second application must be refused',
      );
      await world.members[0]!.approve(employer.account);
      await rejects(() => world.members[0]!.approve(employer.account), 'a double vote must fail');
      let info = await world.reader.issuer(employer.account);
      check(info.status === 'PENDING' && info.approvals === 1, 'one vote leaves it PENDING');
      await world.members[1]!.approve(employer.account);
      info = await world.reader.issuer(employer.account);
      check(info.status === 'ACTIVE' && info.accreditedAt !== null, 'quorum makes it ACTIVE');
    },
  },
  {
    name: 'only a member can approve',
    async run(world) {
      const employer = await newEmployer(world, 'Conformance Outsider');
      await employer.client.applyForAccreditation(employer.name);
      await rejects(() => employer.client.approve(employer.account), 'a non-member vote must fail');
    },
  },
  {
    name: 'anchor needs an ACTIVE issuer and a live key; the record reads back',
    async run(world) {
      const pending = await newEmployer(world, 'Conformance NotYet');
      await pending.client.applyForAccreditation(pending.name);
      await rejects(() => pending.client.anchor(randomHash()), 'a PENDING issuer cannot anchor');

      const employer = await accredit(world, 'Conformance Active');
      const hash = randomHash();
      const receipt = await employer.client.anchor(hash);
      check(receipt.feeWei === '0', 'the user pays nothing');
      await rejects(() => employer.client.anchor(hash), 'anchoring twice must fail');
      const record = await world.reader.record(employer.account, hash);
      check(record !== null && record.keyId === employer.signer.keyId, 'the record carries the key');
      check(record.revokedAt === null && record.anchoredAt > 0, 'timestamps are epoch seconds');
    },
  },
  {
    name: 'revoke is by the issuer only and cannot repeat',
    async run(world) {
      const employer = await accredit(world, 'Conformance Revoker');
      const other = await accredit(world, 'Conformance Other');
      const hash = randomHash();
      await employer.client.anchor(hash);
      await rejects(() => other.client.revoke(hash), 'another issuer cannot revoke');
      await employer.client.revoke(hash);
      check(typeof (await world.reader.record(employer.account, hash))?.revokedAt === 'number', 'revokedAt set');
      await rejects(() => employer.client.revoke(hash), 'a second revoke must fail');
      await rejects(() => employer.client.revoke(randomHash()), 'revoking nothing must fail');
    },
  },
  {
    name: 'owner keys have addedAt and removedAt windows, never the last owner',
    async run(world) {
      const employer = await accredit(world, 'Conformance Keys');
      const second = (await generateSigner()).signer;
      await employer.client.addKey(second.jwk);
      await rejects(() => employer.client.addKey(second.jwk), 'a duplicate owner must fail');
      const added = await world.reader.key(employer.account, second.keyId);
      check(added !== null && added.removedAt === null && added.addedAt > 0, 'second key is live');
      await employer.client.removeKey(second.keyId);
      const removed = await world.reader.key(employer.account, second.keyId);
      check(typeof removed?.removedAt === 'number', 'removed keys stay in the history with removedAt');
      await rejects(() => employer.client.removeKey(employer.signer.keyId), 'the last owner stays');
      await rejects(
        async () => (await world.clientFor(second, employer.account)).anchor(randomHash()),
        'a removed key cannot sign any more',
      );
    },
  },
  {
    name: 'a suspended issuer keeps its anchors but cannot anchor',
    async run(world) {
      const employer = await accredit(world, 'Conformance Suspended');
      const hash = randomHash();
      await employer.client.anchor(hash);
      for (const member of world.members.slice(0, world.quorum)) {
        await member.suspend(employer.account);
      }
      check((await world.reader.issuer(employer.account)).status === 'SUSPENDED', 'quorum suspends');
      check((await world.reader.record(employer.account, hash)) !== null, 'anchors survive');
      await rejects(() => employer.client.anchor(randomHash()), 'a suspended issuer cannot anchor');
    },
  },
  {
    name: 'state and head have the contracts shape',
    async run(world) {
      const state = await world.reader.state();
      check(state.quorum === world.quorum && state.members.length >= world.quorum, 'members');
      check(state.blocks.length > 0 && state.blocks.length <= 16, 'at most 16 blocks');
      check(state.anchors.length <= 10, 'at most 10 anchors');
      check(!('validators' in state), 'no validators');
      const head = await world.reader.head();
      check(head.number > 0 && head.time > 0, 'head');
    },
  },
];
