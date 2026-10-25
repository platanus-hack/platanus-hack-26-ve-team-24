import 'server-only';
import { LedgerUnreachableError } from './types';
import type { LedgerReader, LookupRequest, LookupResponse } from './types';

export async function lookup(reader: LedgerReader, req: LookupRequest): Promise<LookupResponse> {
  const [head, issuer, key, record] = await Promise.all([
    reader.head(),
    reader.issuer(req.issuer),
    reader.key(req.issuer, req.keyId),
    reader.record(req.issuer, req.credentialHash),
  ]);
  return { head, issuer, key, record };
}

export const badRequest = (message = 'Invalid request') =>
  Response.json({ error: 'BAD_REQUEST', message }, { status: 400 });

/** Maps the ledger being down to 503; anything else is a bug and propagates. */
export async function respondWithLedger(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof LedgerUnreachableError)) throw error;
    return Response.json(
      { error: 'LEDGER_UNREACHABLE', message: 'El registro no responde en este momento' },
      { status: 503 },
    );
  }
}
