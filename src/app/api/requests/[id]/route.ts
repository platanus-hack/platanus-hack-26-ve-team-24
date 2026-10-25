import { getDb } from '@/lib/server/db';
import { HttpError, respond } from '@/lib/server/http';
import { isExpired, isId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';

export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    rateLimit(req, 'requests:poll', { limit: 120, windowMs: 60_000 });
    const { id } = await params;
    const notFound = new HttpError(404, 'NOT_FOUND', 'Solicitud desconocida');
    if (!isId(id)) throw notFound;
    const row = await getDb().certRequest.findUnique({ where: { id } });
    if (!row) throw notFound;
    if (isExpired(row.expiresAt)) {
      await getDb().certRequest.delete({ where: { id } });
      throw notFound;
    }
    return Response.json({ status: row.status, delivery: row.deliveryJwe });
  });
}
