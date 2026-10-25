import { getLedgerReader } from '@/lib/ledger/reader';
import { LedgerUnreachableError } from '@/lib/ledger/types';
import { HttpError, respond } from '@/lib/server/http';
import { requireEmployer } from '@/lib/server/session';

export function GET(req: Request) {
  return respond(async () => {
    const { account } = await requireEmployer(req);
    try {
      const { name, status } = await getLedgerReader().issuer(account);
      return Response.json({ account, name, status });
    } catch (error) {
      if (!(error instanceof LedgerUnreachableError)) throw error;
      throw new HttpError(503, 'LEDGER_UNREACHABLE', 'El registro no responde en este momento');
    }
  });
}
