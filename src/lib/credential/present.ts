import type { Es256Signer } from './keys';
import { fromB64u, parseJsonSegment, sha256B64u, signJws, splitJws, toB64u } from './jws';
import type { ClaimName, DisclosedClaims } from './types';

const EMPLOYMENT: ClaimName[] = ['employedNow', 'startDate', 'endDate', 'workCountry'];

export const REVEAL_TEMPLATES: Record<
  'employment' | 'income' | 'role' | 'identity' | 'full',
  ClaimName[]
> = {
  employment: EMPLOYMENT,
  income: [...EMPLOYMENT, 'salaryBand'],
  role: [...EMPLOYMENT, 'jobTitle', 'department', 'employmentType'],
  identity: ['givenName', 'familyName', 'nationalId'],
  full: [
    'givenName',
    'familyName',
    'nationalId',
    'jobTitle',
    'department',
    'employmentType',
    'startDate',
    'endDate',
    'employedNow',
    'workCountry',
    'salaryMonthlyUsd',
    'salaryBand',
  ],
};

const CLAIM_NAMES = new Set<string>(REVEAL_TEMPLATES.full);

/** El mensaje es una frase en español: se muestra como fallo de la comprobación «Constancia». */
export class TokenError extends Error {}

type JsonObject = Record<string, unknown>;

interface ParsedDisclosure {
  digest: string;
  name: ClaimName;
  value: string | number | boolean;
}

function parseDisclosure(encoded: string): ParsedDisclosure {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(fromB64u(encoded)));
  } catch {
    throw new TokenError('Uno de los datos no se puede leer');
  }
  const [, name, value] = Array.isArray(decoded) && decoded.length === 3 ? decoded : [];
  const validValue = ['string', 'number', 'boolean'].includes(typeof value);
  if (typeof name !== 'string' || !CLAIM_NAMES.has(name) || !validValue) {
    throw new TokenError('Uno de los datos está mal formado o no es un dato conocido');
  }
  return { digest: sha256B64u(encoded), name: name as ClaimName, value };
}

const parseSegment = (segment: string, what: string): JsonObject => {
  try {
    return parseJsonSegment(segment);
  } catch {
    throw new TokenError(`${what} no se puede leer`);
  }
};

/** The presentation string up to and including the last '~': what sd_hash covers. */
export function presentationPrefix(credential: string, reveal: ClaimName[]): string {
  const [issuerJwt, ...rest] = credential.split('~');
  const chosen = rest
    .filter((encoded) => encoded.length > 0)
    .filter((encoded) => reveal.includes(parseDisclosure(encoded).name));
  return [issuerJwt, ...chosen, ''].join('~');
}

export async function presentCredential(args: {
  credential: string; // issuance form
  holder: Es256Signer;
  reveal: ClaimName[];
  aud: string;
  ttlSec: number;
  nonce?: string;
  now?: Date;
  cvSet?: string;
}): Promise<string> {
  const prefix = presentationPrefix(args.credential, args.reveal);
  const iat = Math.floor((args.now ?? new Date()).getTime() / 1000);
  const payload = {
    iat,
    exp: iat + args.ttlSec,
    aud: args.aud,
    nonce: args.nonce ?? toB64u(crypto.getRandomValues(new Uint8Array(16))),
    sd_hash: sha256B64u(prefix),
    ...(args.cvSet !== undefined && { cv_set: args.cvSet }),
  };
  const kbJwt = await signJws({ alg: 'ES256', typ: 'kb+jwt' }, payload, args.holder);
  return prefix + kbJwt;
}

export interface DecodedPresentation {
  issuerJwt: string;
  header: JsonObject;
  payload: JsonObject;
  claims: DisclosedClaims; // only what the presentation discloses
  hiddenCount: number; // digests in _sd that no disclosure matched
  sdHash: string; // base64url sha256 of "<issuerJwt>~<disclosures>~"
  keyBinding: { jwt: string; header: JsonObject; payload: JsonObject } | null;
}

function decodeKeyBinding(jwt: string): NonNullable<DecodedPresentation['keyBinding']> {
  const parts = splitJws(jwt);
  if (!parts) throw new TokenError('La firma del titular está mal formada');
  return {
    jwt,
    header: parseSegment(parts[0], 'El encabezado de la firma del titular'),
    payload: parseSegment(parts[1], 'El contenido de la firma del titular'),
  };
}

export function decodePresentation(s: string): DecodedPresentation {
  const segments = s.trim().split('~');
  if (segments.length < 2) throw new TokenError('Esto no es una constancia');
  const [issuerJwt, ...disclosures] = segments;
  const kbJwt = disclosures.pop() ?? '';

  const parts = splitJws(issuerJwt);
  if (!parts) throw new TokenError('Esto no es una constancia');
  const header = parseSegment(parts[0], 'El encabezado de la constancia');
  const payload = parseSegment(parts[1], 'El contenido de la constancia');

  const digests = (payload.credentialSubject as { _sd?: unknown } | undefined)?._sd;
  if (!Array.isArray(digests) || !digests.every((d) => typeof d === 'string')) {
    throw new TokenError('La constancia no enumera sus datos');
  }
  const listed = new Set<string>(digests);

  const claims: DisclosedClaims = {};
  const seen = new Set<string>();
  for (const encoded of disclosures) {
    const disclosure = parseDisclosure(encoded);
    if (!listed.has(disclosure.digest)) {
      throw new TokenError('Un dato mostrado se cambió después de que el empleador lo firmó');
    }
    if (seen.has(disclosure.digest)) throw new TokenError('Un dato aparece dos veces');
    seen.add(disclosure.digest);
    claims[disclosure.name] = disclosure.value;
  }

  return {
    issuerJwt,
    header,
    payload,
    claims,
    hiddenCount: listed.size - seen.size,
    sdHash: sha256B64u([issuerJwt, ...disclosures, ''].join('~')),
    keyBinding: kbJwt ? decodeKeyBinding(kbJwt) : null,
  };
}
