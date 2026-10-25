import { getDb } from '@/lib/server/db';
import { HttpError, respond } from '@/lib/server/http';
import { isId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';
import { assertCanDecline } from '@/lib/server/request-rules';
import { requireEmployer } from '@/lib/server/session';

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const { account } = await requireEmployer(req);
    rateLimit(req, 'employer:decline', { limit: 60, windowMs: 60_000 });
    const { id } = await params;
    const row = isId(id) ? await getDb().certRequest.findUnique({ where: { id } }) : null;
    assertCanDecline(row, account);
    const { count } = await getDb().certRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });
    if (count === 0) throw new HttpError(409, 'NOT_PENDING', 'Esta solicitud ya fue atendida');
    return Response.json({ status: 'DECLINED' });
  });
}
