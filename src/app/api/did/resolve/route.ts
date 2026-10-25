import { badRequest, respondWithLedger } from '@/lib/ledger/gateway';
import { buildDidDocument, LEDGER_CHAIN_ID, parseDid } from '@/lib/ledger/did';
import { getLedgerReader } from '@/lib/ledger/reader';

export async function GET(request: Request) {
  const did = new URL(request.url).searchParams.get('did') ?? '';
  const parsed = parseDid(did);
  if (!parsed || parsed.chainId !== LEDGER_CHAIN_ID) return badRequest('Not a Constancia DID');
  return respondWithLedger(async () => {
    const reader = getLedgerReader();
    const [issuer, keys] = await Promise.all([reader.issuer(parsed.account), reader.keys(parsed.account)]);
    if (issuer.status === 'NONE' && keys.length === 0) {
      return Response.json({ error: 'DID_NOT_FOUND', message: 'Ese DID no existe' }, { status: 404 });
    }
    return Response.json(buildDidDocument(did, issuer, keys));
  });
}
