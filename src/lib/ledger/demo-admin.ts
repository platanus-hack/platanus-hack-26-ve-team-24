import 'server-only';
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { ledgerAbi } from './abi';

// DEMO ONLY. Calls Ledger.demoAccredit() as the admin the contract was deployed with.
//
// The admin key is the relayer's: the same EOA that already pays gas for every handleOps. Reusing it
// means no second secret to hold, and this module never reaches the browser. Putting a key in
// NEXT_PUBLIC_* would inline it into JavaScript that every visitor downloads, and the browser would
// still need a funded EOA and a raw-transaction relay to use it.
//
// There is no `if (demo) return` here: the call is real, the receipt is real, and the contract
// records IssuerDemoAccredited so nobody can mistake it for a member vote.

const ZERO = /^0x0{40}$/;

function settings(): { rpc: string; key: Hex; ledger: Address } {
  const { LEDGER_RPC_URL, RELAYER_PRIVATE_KEY, LEDGER_CONTRACT_ADDRESS } = process.env;
  const missing = [
    LEDGER_RPC_URL ? '' : 'LEDGER_RPC_URL',
    /^0x[0-9a-fA-F]{64}$/.test(RELAYER_PRIVATE_KEY ?? '') ? '' : 'RELAYER_PRIVATE_KEY',
    LEDGER_CONTRACT_ADDRESS && !ZERO.test(LEDGER_CONTRACT_ADDRESS) ? '' : 'LEDGER_CONTRACT_ADDRESS',
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Demo admin needs: ${missing.join(', ')}`);
  return {
    rpc: LEDGER_RPC_URL as string,
    key: RELAYER_PRIVATE_KEY as Hex,
    ledger: LEDGER_CONTRACT_ADDRESS as Address,
  };
}

export async function demoAccredit(issuer: Address): Promise<{ txHash: Hex; blockNumber: number }> {
  const { rpc, key, ledger } = settings();
  const transport = http(rpc);
  const account = privateKeyToAccount(key);
  const client = createPublicClient({ chain: sepolia, transport });
  const wallet = createWalletClient({ account, chain: sepolia, transport });

  // Simulate first: a revert here costs nothing and tells the caller why in a sentence.
  const { request } = await client.simulateContract({
    account,
    address: ledger,
    abi: ledgerAbi,
    functionName: 'demoAccredit',
    args: [issuer],
  });
  const txHash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error(`demoAccredit reverted (tx ${txHash})`);
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}
