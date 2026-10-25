import 'server-only';
import { HttpError } from './http';

interface Window {
  count: number;
  resetAt: number;
}

// shortcut: in-memory fixed window per instance; move to Redis if we ever run two instances.
const windows = new Map<string, Window>();

const clientIp = (req: Request) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export function rateLimit(
  req: Request,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now(),
): void {
  const id = `${key}:${clientIp(req)}`;
  const current = windows.get(id);
  if (!current || current.resetAt <= now) {
    if (windows.size > 10_000) windows.clear();
    windows.set(id, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new HttpError(429, 'RATE_LIMITED', 'Demasiados intentos. Espera un momento.');
}
