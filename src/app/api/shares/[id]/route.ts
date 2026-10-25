import { getDb } from '@/lib/server/db';
import { HttpError, respond } from '@/lib/server/http';
import { isExpired, isId } from '@/lib/server/mailbox';
import { rateLimit } from '@/lib/server/rate-limit';

export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    rateLimit(req, 'shares:read', { limit: 120, windowMs: 60_000 });
    const { id } = await params;
    const notFound = new HttpError(404, 'NOT_FOUND', 'Enlace desconocido');
    if (!isId(id)) throw notFound;
    const row = await getDb().share.findUnique({ where: { id } });
    if (!row) throw notFound;
    if (isExpired(row.expiresAt)) {
      await getDb().share.delete({ where: { id } });
      throw new HttpError(410, 'EXPIRED', 'Este enlace expiró');
    }
    return Response.json({ ciphertext: row.ciphertext, expiresAt: row.expiresAt.toISOString() });
  });
}
