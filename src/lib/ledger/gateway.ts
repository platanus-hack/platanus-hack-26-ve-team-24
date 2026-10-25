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

/** Only a transport failure becomes 503; anything else is a server-side fault and still answers JSON. */
export async function respondWithLedger(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof LedgerUnreachableError) {
      return Response.json(
        { error: 'LEDGER_UNREACHABLE', message: 'The ledger is not answering right now' },
        { status: 503 },
      );
    }
    // Rethrowing here produced Next's HTML error page, which the browser then reported as an
    // unreachable ledger. A JSON 500 at least keeps the failure legible.
    console.error('ledger gateway failed', error);
    return Response.json({ error: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
