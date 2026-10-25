import 'server-only';
import { z } from 'zod';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message = code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/** Reads a size-capped JSON body and validates it. Never logs the body. */
export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
  maxBytes: number,
): Promise<z.output<S>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'TOO_LARGE', 'Request body too large');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Body must be JSON');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, 'BAD_REQUEST', 'Invalid request');
  return parsed.data;
}

/** Turns thrown HttpErrors into the `{ error, message }` shape of contracts §8. */
export async function respond(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status });
    }
    // Without this line the cause existed nowhere: the client got a sentence and the server said nothing.
    console.error('request failed', error);
    return Response.json({ error: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
