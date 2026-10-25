import { accountFactoryAbi } from '../../src/lib/ledger/abi';
import { publicClient } from './config.mjs';
import { deployArtifact, jwkCoordinates, readAddresses, readIdentities, relayer, saveAddresses } from './lib.mjs';

// Idempotent: whatever is already recorded in demo-pack/addresses.json is never redeployed.
const QUORUM = 2;
const SALT = BigInt(0);
const addresses = readAddresses();

if (!addresses.factory) {
  addresses.factory = (await deployArtifact('AccountFactory')).address;
  saveAddresses(addresses);
}
if (!addresses.paymaster) {
  addresses.paymaster = (await deployArtifact('VerifyingPaymaster', [relayer().address])).address;
  saveAddresses(addresses);
}
if (!addresses.ledger) {
  const { members } = readIdentities();
  const client = publicClient();
  const accounts = await Promise.all(
    members.map(({ jwk }) => {
      const { x, y } = jwkCoordinates(jwk);
      return client.readContract({
        address: addresses.factory!,
        abi: accountFactoryAbi,
        functionName: 'getAddress',
        args: [x, y, SALT],
      });
    }),
  );
  const { address, block } = await deployArtifact('Ledger', [
    accounts,
    members.map((m) => m.name),
    QUORUM,
    relayer().address,
  ]);
  addresses.ledger = address;
  addresses.ledgerDeployBlock = block;
  saveAddresses(addresses);
}

console.log(`LEDGER_CONTRACT_ADDRESS=${addresses.ledger}`);
console.log(`LEDGER_DEPLOY_BLOCK=${addresses.ledgerDeployBlock}`);
console.log(`NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS=${addresses.factory}`);
console.log(`PAYMASTER_ADDRESS=${addresses.paymaster}`);
