// What a Constancia PDF carries besides its visual layer: the token, as JSON in the file's metadata.
import type { P256PrivateJwk } from '../credential/types';

export type DocPayload =
  /** Issuance form of the SD-JWT (every disclosure) plus the key it is bound to. */
  | { type: 'credential'; sdJwt: string; holderKey: P256PrivateJwk }
  /** One presentation: the disclosures the holder chose, signed by the holder key. */
  | { type: 'presentation'; presentation: string }
  /** The unified history: a `constancia-cv` file as text. */
  | { type: 'cv'; cv: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function isPrivateJwk(value: unknown): value is P256PrivateJwk {
  return (
    isObject(value) &&
    value.kty === 'EC' &&
    value.crv === 'P-256' &&
    isString(value.x) &&
    isString(value.y) &&
    isString(value.d)
  );
}

export function parsePayload(json: string): DocPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed.constancia !== 1) return null;
  if (parsed.type === 'credential' && isString(parsed.sdJwt) && isPrivateJwk(parsed.holderKey)) {
    return { type: 'credential', sdJwt: parsed.sdJwt, holderKey: parsed.holderKey };
  }
  if (parsed.type === 'presentation' && isString(parsed.presentation)) {
    return { type: 'presentation', presentation: parsed.presentation };
  }
  if (parsed.type === 'cv' && isString(parsed.cv)) return { type: 'cv', cv: parsed.cv };
  return null;
}

export const serializePayload = (payload: DocPayload): string =>
  JSON.stringify({ constancia: 1, ...payload });
