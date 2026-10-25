import { z } from 'zod';
import type { Address } from '@/lib/credential/types';
import { demoAccredit } from '@/lib/ledger/demo-admin';
import { notFound } from '@/lib/ledger/dev-gate';
import { getLedgerReader } from '@/lib/ledger/reader';
import { LedgerUnreachableError } from '@/lib/ledger/types';
import { HttpError, readJson, respond } from '@/lib/server/http';
import { rateLimit } from '@/lib/server/rate-limit';

// DEMO ONLY. The contract's admin accredits a pending employer without a member quorum, so a
// visitor can complete the flow alone. It is a real transaction signed by the admin key on the
// server; the contract emits IssuerDemoAccredited so the shortcut stays visible on chain.
//
// Gate: NEXT_PUBLIC_DEMO_MODE, the same one behind /ledger/operator and /dev/identity. With it off
// this route answers 404 and nothing can be accredited from here.

const MAX_BODY_BYTES = 512;

const BODY = z.object({
  issuer: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .transform((value) => value.toLowerCase() as Address),
});

async function readIssuer(issuer: Address) {
  try {
    return await getLedgerReader().issuer(issuer);
  } catch (error) {
    if (!(error instanceof LedgerUnreachableError)) throw error;
    throw new HttpError(503, 'LEDGER_UNREACHABLE', 'The ledger cannot be reached right now');
  }
}

export function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') return notFound();

  return respond(async () => {
    rateLimit(request, 'demo:accredit', { limit: 6, windowMs: 60_000 });
    const { issuer } = await readJson(request, BODY, MAX_BODY_BYTES);

    const before = await readIssuer(issuer);
    if (before.status === 'ACTIVE') {
      throw new HttpError(409, 'ALREADY_ACCREDITED', 'This employer is already accredited');
    }
    if (before.status === 'NONE') {
      throw new HttpError(409, 'NOT_PENDING', 'This employer has not applied for accreditation');
    }

    const { txHash, blockNumber } = await demoAccredit(issuer);
    const after = await readIssuer(issuer);

    return Response.json({
      issuer,
      status: after.status,
      approvals: after.approvals,
      quorum: after.quorum,
      admin: { txHash, blockNumber },
    });
  });
}
