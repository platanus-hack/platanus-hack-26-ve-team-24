import { getDb } from '@/lib/server/db';
import { HttpError, respond } from '@/lib/server/http';
import { isId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    rateLimit(req, 'requests:ack', { limit: 60, windowMs: 60_000 });
    const { id } = await params;
    const { count } = await getDb().certRequest.updateMany({
      where: { id: isId(id) ? id : '' },
      data: { deliveryJwe: null },
    });
    if (count === 0) throw new HttpError(404, 'NOT_FOUND', 'Solicitud desconocida');
    return Response.json({});
  });
}
