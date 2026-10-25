import { encodeFunctionData, type Address } from 'viem';
import { signerFromPrivateJwk, type Es256Signer } from '../../src/lib/credential/keys';
import type { P256PrivateJwk } from '../../src/lib/credential/types';
import { ledgerAbi } from '../../src/lib/ledger/abi';
import { readAddresses, readIdentities } from './lib.mjs';
import { sendAccountCall } from './userop.mjs';

// Casts consortium votes so a PENDING employer reaches quorum without a browser: the demo members
// already hold their keys in demo-pack/identities.json, and every op is sponsored like any other.
// Usage: pnpm chain:accredit <issuer> [memberName...]
const QUORUM = 2;

const issuer = process.argv[2] as Address | undefined;
if (!issuer) {
  console.error('usage: pnpm chain:accredit <issuerAddress> [memberName...]');
  process.exit(1);
}

const ledger = (process.env.LEDGER_CONTRACT_ADDRESS ?? readAddresses().ledger) as Address | undefined;
if (!ledger) {
  console.error('No ledger address: set LEDGER_CONTRACT_ADDRESS or run pnpm chain:deploy');
  process.exit(1);
}

const wanted = process.argv.slice(3);
const { members } = readIdentities();
const voters = wanted.length > 0 ? members.filter((member) => wanted.includes(member.name)) : members.slice(0, QUORUM);

if (voters.length < QUORUM) {
  console.error(`Need ${QUORUM} members to vote, found ${voters.length}. Available: ${members.map((m) => m.name).join(', ')}`);
  process.exit(1);
}

const data = encodeFunctionData({ abi: ledgerAbi, functionName: 'approve', args: [issuer] });

for (const member of voters.slice(0, QUORUM)) {
  const signer: Es256Signer = await signerFromPrivateJwk(member.jwk as P256PrivateJwk);
  const { txHash, blockNumber } = await sendAccountCall({ signer, target: ledger, data });
  console.log(`${member.name.padEnd(28)} approved in block ${blockNumber} (${txHash})`);
}

console.log(`\n${issuer} now has ${Math.min(QUORUM, voters.length)}/${QUORUM} approvals.`);
