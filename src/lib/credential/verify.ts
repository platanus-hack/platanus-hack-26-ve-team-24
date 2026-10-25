import { keyIdOf, verifyEs256 } from './keys';
import { fromB64u, splitJws, utf8 } from './jws';
import { credentialHashOf } from './sdjwt';
import { decodePresentation, TokenError, type DecodedPresentation } from './present';
import type { Address, DisclosedClaims, Hex, P256Jwk } from './types';
import type { LookupRequest, LookupResponse, RecordInfo } from '../ledger/types';

export type CheckCode = 'TOKEN' | 'ISSUER' | 'SIGNATURE' | 'HOLDER' | 'LEDGER';
export type CheckStatus =
  | 'PENDING'
  | 'CHECKING'
  | 'VERIFIED'
  | 'FAILED'
  | 'UNAVAILABLE'
  | 'NOT_EXAMINED';

export interface CheckEvent {
  index: 1 | 2 | 3 | 4 | 5; // TOKEN=1 ISSUER=2 SIGNATURE=3 HOLDER=4 LEDGER=5
  code: CheckCode;
  status: CheckStatus;
  measured?: string; // "1.842 bytes · 7 ocultos" · "Empresa Demo A" · "ES256 · 1.1 ms" · "clave 0x9c… · vinculada" · "bloque 1.204"
  detail?: string; // one human sentence
  elapsedMs?: number;
}

export type Verdict =
  | {
      kind: 'AUTHENTIC';
      claims: DisclosedClaims;
      hiddenCount: number;
      issuer: { did: string; account: Address; name: string };
      record: RecordInfo;
      keyBound: boolean;
      validUntil: string | null;
    }
  | { kind: 'NOT_AUTHENTIC'; failedAt: CheckCode; reason: string }
  | { kind: 'UNAVAILABLE'; failedAt: 'ISSUER' | 'LEDGER'; reason: string }; // ledger gateway unreachable

export type LookupFn = (req: LookupRequest) => Promise<LookupResponse>; // the verifier injects lookupLedger

export interface VerifyContext {
  lookup: LookupFn;
  expectNonce?: string;
  requireKeyBinding?: boolean /* default true */;
  maxSkewSec?: number /* default 300 */;
}

// shortcut: chain ID fixed to the demo ledger, read it from env when a second network exists.
const CHAIN_ID = '11155111';
const CHECK_CODES: CheckCode[] = ['TOKEN', 'ISSUER', 'SIGNATURE', 'HOLDER', 'LEDGER'];
const DID_PATTERN = /^did:constancia:(\d+):(0x[0-9a-f]{40})$/;
const DEFAULT_SKEW_SEC = 300;
const MAX_INPUT_BYTES = 256 * 1024;
const CONTEXT_SUFFIX = '/contexts/constancia-v1.jsonld';
const KEY_ID_PATTERN = /^0x[0-9a-f]{64}$/;

class CheckFailure extends Error {
  constructor(
    message: string,
    readonly status: 'FAILED' | 'UNAVAILABLE' = 'FAILED',
  ) {
    super(message);
  }
}

interface Entry {
  decoded: DecodedPresentation;
  did: string;
  account: Address;
  keyId: Hex;
  credentialHash: Hex;
  holderJwk: P256Jwk;
  lookup?: LookupResponse;
}

interface Outcome {
  measured?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatInt = (n: number): string => n.toLocaleString('es-VE');

function checkToken(decoded: DecodedPresentation): Entry {
  const { header, payload } = decoded;
  const context = payload['@context'];
  const type = payload.type;
  if (header.alg !== 'ES256' || header.typ !== 'vc+sd-jwt' || header.cty !== 'vc') {
    throw new CheckFailure('El encabezado no es el de una constancia');
  }
  if (!Array.isArray(context) || context[0] !== 'https://www.w3.org/ns/credentials/v2') {
    throw new CheckFailure('La constancia no usa el contexto de credencial esperado');
  }
  if (typeof context[1] !== 'string' || !context[1].endsWith(CONTEXT_SUFFIX)) {
    throw new CheckFailure('La constancia usa un vocabulario desconocido');
  }
  if (!Array.isArray(type) || !type.includes('EmploymentCredential')) {
    throw new CheckFailure('Esto no es una constancia de trabajo');
  }
  const did = payload.issuer;
  const match = typeof did === 'string' ? DID_PATTERN.exec(did) : null;
  if (!match || payload.iss !== did) throw new CheckFailure('La constancia no indica un emisor válido');
  if (match[1] !== CHAIN_ID) throw new CheckFailure('El emisor pertenece a otro registro');
  const kid = typeof header.kid === 'string' ? header.kid : '';
  const [kidDid, keyId = ''] = kid.split('#');
  if (kidDid !== did || !KEY_ID_PATTERN.test(keyId)) {
    throw new CheckFailure('La referencia a la clave de firma no coincide con el emisor');
  }
  const holderJwk = isObject(payload.cnf) ? payload.cnf.jwk : undefined;
  if (!isObject(holderJwk) || holderJwk.crv !== 'P-256' || holderJwk.kty !== 'EC') {
    throw new CheckFailure('La constancia no está vinculada a la clave de un titular');
  }
  return {
    decoded,
    did: did as string,
    account: match[2] as Address,
    keyId: keyId as Hex,
    credentialHash: credentialHashOf(decoded.issuerJwt),
    holderJwk: holderJwk as unknown as P256Jwk,
  };
}

const statusReasons = {
  NONE: 'El consorcio no ha acreditado a este empleador',
  PENDING: 'La acreditación del empleador todavía espera aprobación',
  SUSPENDED: 'El consorcio suspendió la acreditación del empleador',
} as const;

async function checkIssuer(entry: Entry, ctx: VerifyContext): Promise<Outcome> {
  let response: LookupResponse;
  try {
    // Only these three fields ever leave the browser.
    response = await ctx.lookup({
      issuer: entry.account,
      keyId: entry.keyId,
      credentialHash: entry.credentialHash,
    });
  } catch {
    throw new CheckFailure('El registro no respondió. Inténtalo de nuevo en un momento', 'UNAVAILABLE');
  }
  entry.lookup = response;
  const { issuer, key } = response;
  if (issuer.status !== 'ACTIVE') throw new CheckFailure(statusReasons[issuer.status]);
  if (!key) throw new CheckFailure('La clave de firma no está registrada a nombre de este empleador');
  return { measured: issuer.name };
}

async function checkSignature(entry: Entry): Promise<Outcome> {
  const key = entry.lookup!.key!;
  if (keyIdOf(key.jwk) !== entry.keyId) {
    throw new CheckFailure('La clave del registro no coincide con la que indica la constancia');
  }
  const [header, payload, signature] = splitJws(entry.decoded.issuerJwt)!;
  const started = performance.now();
  const valid = await verifyEs256(key.jwk, utf8(`${header}.${payload}`), fromB64u(signature));
  if (!valid) throw new CheckFailure('La firma del empleador no corresponde a esta constancia');
  return { measured: `ES256 · ${(performance.now() - started).toFixed(1)} ms` };
}

async function checkHolder(
  entry: Entry,
  ctx: VerifyContext,
  expectCvSet: string | undefined,
): Promise<Outcome> {
  const { keyBinding, sdHash } = entry.decoded;
  if (!keyBinding) throw new CheckFailure('Esta presentación no trae la firma del titular');
  const { header, payload, jwt } = keyBinding;
  if (header.alg !== 'ES256' || header.typ !== 'kb+jwt') {
    throw new CheckFailure('El encabezado de la firma del titular no es válido');
  }
  const [h, p, signature] = splitJws(jwt)!;
  if (!(await verifyEs256(entry.holderJwk, utf8(`${h}.${p}`), fromB64u(signature)))) {
    throw new CheckFailure('La firma del titular no se hizo con la clave que indica la constancia');
  }
  if (payload.sd_hash !== sdHash) {
    throw new CheckFailure('La firma del titular cubre otro conjunto de datos');
  }
  if (typeof payload.aud !== 'string' || payload.aud.length === 0) {
    throw new CheckFailure('La presentación no indica para quién se hizo');
  }
  if (typeof payload.nonce !== 'string') throw new CheckFailure('La presentación no trae su código de un solo uso');
  if (ctx.expectNonce !== undefined && payload.nonce !== ctx.expectNonce) {
    throw new CheckFailure('La presentación responde a otro desafío');
  }
  const ledgerNow = entry.lookup!.head.time;
  if (typeof payload.iat === 'number' && payload.iat > ledgerNow + (ctx.maxSkewSec ?? DEFAULT_SKEW_SEC)) {
    throw new CheckFailure('Lo compartido tiene fecha futura. Revisa el reloj del dispositivo que lo creó');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= ledgerNow) {
    throw new CheckFailure('Lo compartido venció. Pídele al titular que lo comparta de nuevo');
  }
  if (expectCvSet !== undefined && payload.cv_set !== expectCvSet) {
    throw new CheckFailure('Esta constancia no se selló junto con las demás');
  }
  return { measured: `clave ${entry.keyId.slice(0, 4)}… · vinculada` };
}

function checkLedger(entry: Entry, maxSkewSec: number): Outcome {
  const { key, record, head } = entry.lookup!;
  const issuedAt = entry.decoded.payload.iat;
  if (typeof issuedAt === 'number' && issuedAt > head.time + maxSkewSec) {
    throw new CheckFailure('Esta constancia tiene fecha futura');
  }
  if (!record) throw new CheckFailure('Esta constancia no aparece en el registro');
  if (record.keyId !== entry.keyId) {
    throw new CheckFailure('La constancia se anotó en el registro con otra clave');
  }
  if (key!.addedAt > record.anchoredAt) {
    throw new CheckFailure('La clave de firma se añadió después de registrar esta constancia');
  }
  if (key!.removedAt !== null && key!.removedAt <= record.anchoredAt) {
    throw new CheckFailure('La clave de firma ya se había retirado cuando se registró esta constancia');
  }
  if (record.revokedAt !== null) throw new CheckFailure('El empleador revocó esta constancia');
  const validUntil = entry.decoded.payload.validUntil;
  if (typeof validUntil === 'string' && Date.parse(validUntil) / 1000 < head.time) {
    throw new CheckFailure('Esta constancia venció');
  }
  return { measured: `bloque ${formatInt(record.blockNumber)}` };
}

/** Shared by presentations, certificates and every entry of a Verified CV. */
export async function* verifyEntry(
  input: string,
  ctx: VerifyContext,
  opts: { requireKeyBinding: boolean; expectCvSet?: string },
): AsyncGenerator<CheckEvent, Verdict> {
  let entry!: Entry;

  const steps: (() => Promise<Outcome> | Outcome)[] = [
    () => {
      if (typeof input !== 'string' || input.trim().length === 0) {
        throw new CheckFailure('Nada que verificar: esto no es texto');
      }
      const bytes = utf8(input).length;
      if (bytes > MAX_INPUT_BYTES) {
        throw new CheckFailure('Es demasiado grande para ser una constancia (límite 256 KB)');
      }
      let decoded: DecodedPresentation;
      try {
        decoded = decodePresentation(input);
      } catch (error) {
        if (error instanceof TokenError) throw new CheckFailure(error.message);
        throw new CheckFailure('Esto no es una constancia');
      }
      entry = checkToken(decoded);
      return { measured: `${formatInt(bytes)} bytes · ${decoded.hiddenCount} ocultos` };
    },
    () => checkIssuer(entry, ctx),
    () => checkSignature(entry),
    () => checkHolder(entry, ctx, opts.expectCvSet),
    () => checkLedger(entry, ctx.maxSkewSec ?? DEFAULT_SKEW_SEC),
  ];

  let failure: { code: CheckCode; error: CheckFailure } | null = null;
  for (const [i, run] of steps.entries()) {
    const code = CHECK_CODES[i];
    const index = (i + 1) as CheckEvent['index'];
    if (failure) {
      yield { index, code, status: 'NOT_EXAMINED' };
      continue;
    }
    if (code === 'HOLDER' && !opts.requireKeyBinding) {
      yield {
        index,
        code,
        status: 'NOT_EXAMINED',
        detail: 'No se comprobó: nadie está presentando esta constancia',
      };
      continue;
    }
    yield { index, code, status: 'CHECKING' };
    const started = performance.now();
    try {
      const outcome = await run();
      yield {
        index,
        code,
        status: 'VERIFIED',
        measured: outcome.measured,
        elapsedMs: performance.now() - started,
      };
    } catch (error) {
      if (!(error instanceof CheckFailure)) throw error;
      failure = { code, error };
      yield {
        index,
        code,
        status: error.status,
        detail: error.message,
        elapsedMs: performance.now() - started,
      };
    }
  }

  if (failure) {
    const { code, error } = failure;
    if (error.status === 'UNAVAILABLE') {
      return { kind: 'UNAVAILABLE', failedAt: code as 'ISSUER' | 'LEDGER', reason: error.message };
    }
    return { kind: 'NOT_AUTHENTIC', failedAt: code, reason: error.message };
  }

  const { decoded, lookup } = entry;
  const validUntil = decoded.payload.validUntil;
  return {
    kind: 'AUTHENTIC',
    claims: decoded.claims,
    hiddenCount: decoded.hiddenCount,
    issuer: { did: entry.did, account: entry.account, name: lookup!.issuer.name },
    record: lookup!.record!,
    keyBound: opts.requireKeyBinding,
    validUntil: typeof validUntil === 'string' ? validUntil : null,
  };
}

export function verifyPresentation(
  input: string,
  ctx: VerifyContext,
): AsyncGenerator<CheckEvent, Verdict> {
  return verifyEntry(input, ctx, { requireKeyBinding: ctx.requireKeyBinding ?? true });
}

// no KB: vault, CV portal
export function verifyCertificate(
  sdJwt: string,
  ctx: Omit<VerifyContext, 'requireKeyBinding'>,
): AsyncGenerator<CheckEvent, Verdict> {
  return verifyEntry(sdJwt, ctx, { requireKeyBinding: false });
}
