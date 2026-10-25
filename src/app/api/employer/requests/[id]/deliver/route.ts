import { z } from 'zod';
import { getLedgerReader } from '@/lib/ledger/reader';
import { LedgerUnreachableError } from '@/lib/ledger/types';
import { getDb } from '@/lib/server/db';
import { HttpError, readJson, respond } from '@/lib/server/http';
import { isId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';
import { assertCanDeliver } from '@/lib/server/request-rules';
import { requireEmployer } from '@/lib/server/session';

const MAX_JWE_BYTES = 32 * 1024;
const BODY = z.object({ jwe: z.string().min(1).max(MAX_JWE_BYTES) });

async function isActive(account: `0x${string}`): Promise<boolean> {
  try {
    return (await getLedgerReader().issuer(account)).status === 'ACTIVE';
  } catch (error) {
    if (!(error instanceof LedgerUnreachableError)) throw error;
    throw new HttpError(503, 'LEDGER_UNREACHABLE', 'El registro no responde en este momento');
  }
}

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const { account } = await requireEmployer(req);
    rateLimit(req, 'employer:deliver', { limit: 60, windowMs: 60_000 });
    const { id } = await params;
    const { jwe } = await readJson(req, BODY, MAX_JWE_BYTES + 256);
    const row = isId(id) ? await getDb().certRequest.findUnique({ where: { id } }) : null;
    assertCanDeliver(row, account, row ? await isActive(account) : false);
    // The status guard in the where clause makes a double delivery lose the race instead of overwriting.
    const { count } = await getDb().certRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'ISSUED', deliveryJwe: jwe },
    });
    if (count === 0) throw new HttpError(409, 'NOT_PENDING', 'Esta solicitud ya fue atendida');
    return Response.json({ status: 'ISSUED' });
  });
}
