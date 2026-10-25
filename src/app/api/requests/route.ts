import { getLedgerReader } from '@/lib/ledger/reader';
import { LedgerUnreachableError } from '@/lib/ledger/types';
import { getDb } from '@/lib/server/db';
import { HttpError, readJson, respond } from '@/lib/server/http';
import { REQUEST_TTL_MS, createRequestSchema, isOnCurve, newId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';

const MAX_BODY_BYTES = 4 * 1024;

async function requireActiveEmployer(account: `0x${string}`) {
  try {
    const issuer = await getLedgerReader().issuer(account);
    if (issuer.status !== 'ACTIVE') {
      throw new HttpError(422, 'EMPLOYER_NOT_ACCREDITED', 'Este empleador no está acreditado');
    }
  } catch (error) {
    if (error instanceof LedgerUnreachableError) {
      throw new HttpError(503, 'LEDGER_UNREACHABLE', 'El registro no responde en este momento');
    }
    throw error;
  }
}

export function POST(req: Request) {
  return respond(async () => {
    rateLimit(req, 'requests:create', { limit: 20, windowMs: 60_000 });
    const body = await readJson(req, createRequestSchema, MAX_BODY_BYTES);
    if (!(await isOnCurve(body.signJwk, 'ECDSA')) || !(await isOnCurve(body.encJwk, 'ECDH'))) {
      throw new HttpError(400, 'BAD_REQUEST', 'Invalid key');
    }
    await requireActiveEmployer(body.employer as `0x${string}`);
    const id = newId();
    const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
    await getDb().certRequest.create({ data: { id, ...body, expiresAt } });
    return Response.json({ id, expiresAt: expiresAt.toISOString() });
  });
}
