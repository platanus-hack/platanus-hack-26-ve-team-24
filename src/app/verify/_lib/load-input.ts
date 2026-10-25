import type { P256PrivateJwk } from '@/lib/credential/types';
import { MAX_INPUT_BYTES, type InputKind, type InputOrigin, type LoadedInput } from './types';

export class InputError extends Error {}

const TOO_LARGE = 'Este archivo es demasiado grande para ser una constancia (límite 256 KB)';
const EMPTY = 'Nada que verificar: el texto está vacío';
const NOT_FOUND = 'Este enlace para compartir no existe o fue eliminado';
const EXPIRED = 'Este enlace venció. Pídele al titular uno nuevo';
const UNREACHABLE = 'No se pudo conectar con el servidor. Inténtalo de nuevo';
const DAMAGED = 'Este enlace está incompleto o dañado';
const NOT_A_CONSTANCIA = 'Este PDF no trae una constancia: no tiene el token firmado adentro';

const SHARE_FRAGMENT = /^s=([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;
const CV_TYPE = 'constancia-cv';

/** Audience of the presentation the verifier makes from a full credential file. */
export const FULL_FILE_AUD = 'Archivo completo';

export function parseShareFragment(hash: string): { id: string; key: string } | null {
  const match = SHARE_FRAGMENT.exec(hash.replace(/^#/, ''));
  return match ? { id: match[1], key: match[2] } : null;
}

async function fetchCiphertext(id: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`/api/shares/${id}`);
  } catch {
    throw new InputError(UNREACHABLE);
  }
  if (res.status === 404) throw new InputError(NOT_FOUND);
  if (res.status === 410) throw new InputError(EXPIRED);
  if (!res.ok) throw new InputError(UNREACHABLE);

  const body = (await res.json().catch(() => null)) as { ciphertext?: unknown } | null;
  if (typeof body?.ciphertext !== 'string') throw new InputError(DAMAGED);
  return body.ciphertext;
}

export async function fetchShareText(id: string, key: string): Promise<string> {
  const ciphertext = await fetchCiphertext(id);
  const { openShare } = await import('@/lib/credential/share-crypto');
  try {
    return await openShare(ciphertext, key);
  } catch {
    throw new InputError(DAMAGED);
  }
}

/**
 * A credential file carries its holder key, so the verifier presents the whole credential with it.
 * That way the Titular check really runs: the signature must come from the key the credential names.
 */
async function presentWholeFile(sdJwt: string, holderKey: P256PrivateJwk): Promise<string> {
  const [{ signerFromPrivateJwk }, { presentCredential, REVEAL_TEMPLATES }] = await Promise.all([
    import('@/lib/credential/keys'),
    import('@/lib/credential/present'),
  ]);
  try {
    return await presentCredential({
      credential: sdJwt,
      holder: await signerFromPrivateJwk(holderKey),
      reveal: REVEAL_TEMPLATES.full,
      aud: FULL_FILE_AUD,
      ttlSec: 300,
    });
  } catch {
    return sdJwt; // unreadable: the checks report what is wrong with it
  }
}

/** Text files are read as they are; a PDF gives up the signed token it carries. */
export async function readInputFile(file: File): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) throw new InputError(TOO_LARGE);
  const { isPdf, readPdfPayload } = await import('@/lib/document/pdf');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPdf(bytes)) {
    const payload = await readPdfPayload(bytes);
    if (!payload) throw new InputError(NOT_A_CONSTANCIA);
    if (payload.type === 'credential') return presentWholeFile(payload.sdJwt, payload.holderKey);
    return payload.type === 'presentation' ? payload.presentation : payload.cv;
  }
  return new TextDecoder().decode(bytes);
}

function isCvObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === CV_TYPE;
}

function kindOf(text: string): InputKind {
  if (!text.startsWith('{')) return 'presentation';
  try {
    return isCvObject(JSON.parse(text)) ? 'cv' : 'presentation';
  } catch {
    return 'presentation';
  }
}

export function inputFromText(text: string, origin: InputOrigin, shareId?: string): LoadedInput {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new InputError(EMPTY);
  if (new TextEncoder().encode(trimmed).length > MAX_INPUT_BYTES) throw new InputError(TOO_LARGE);
  return {
    text: trimmed,
    kind: kindOf(trimmed),
    origin,
    ...(shareId !== undefined && { shareId }),
  };
}
