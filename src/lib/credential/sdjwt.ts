// Hand-rolled SD-JWT VC issuance (contracts §4.2): about 100 lines over jose, noble and WebCrypto.
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { employmentRecordSchema } from './types';
import type { Es256Signer } from './keys';
import { sha256B64u, signJws, toB64u, utf8 } from './jws';
import type { Address, DisclosedClaims, EmploymentRecord, Hex, P256Jwk } from './types';

export interface IssuedCredential {
  sdJwt: string; // issuance form, all disclosures
  issuerJwt: string;
  credentialHash: Hex;
  did: string;
  account: Address;
  keyId: Hex;
  validUntil: string | null;
  claims: DisclosedClaims; // everything, for the holder's own screen
}

const VALIDITY_SECONDS = 90 * 24 * 60 * 60;

export function salaryBandOf(monthlyUsd: number): string {
  if (monthlyUsd < 300) return '<300';
  if (monthlyUsd < 600) return '300-600';
  if (monthlyUsd < 1000) return '600-1000';
  if (monthlyUsd < 2000) return '1000-2000';
  return '2000+';
}

const isoSeconds = (epochSeconds: number): string =>
  new Date(epochSeconds * 1000).toISOString().replace('.000Z', 'Z');

function claimsOf(record: EmploymentRecord): DisclosedClaims {
  const claims: DisclosedClaims = {
    givenName: record.givenName,
    familyName: record.familyName,
    nationalId: record.nationalId,
    jobTitle: record.jobTitle,
    employmentType: record.employmentType,
    startDate: record.startDate,
    employedNow: record.endDate === undefined,
    workCountry: record.workCountry,
  };
  if (record.department !== undefined) claims.department = record.department;
  if (record.endDate !== undefined) claims.endDate = record.endDate;
  if (record.salaryMonthlyUsd !== undefined) {
    claims.salaryMonthlyUsd = record.salaryMonthlyUsd;
    claims.salaryBand = salaryBandOf(record.salaryMonthlyUsd);
  }
  return claims;
}

function makeDisclosure(name: string, value: unknown): { disclosure: string; digest: string } {
  const salt = toB64u(crypto.getRandomValues(new Uint8Array(16)));
  const disclosure = toB64u(JSON.stringify([salt, name, value]));
  return { disclosure, digest: sha256B64u(disclosure) };
}

export function credentialHashOf(issuerJwt: string): Hex {
  return `0x${bytesToHex(sha256(utf8(issuerJwt)))}`;
}

export async function issueCredential(args: {
  record: EmploymentRecord;
  issuer: { did: string; keyId: Hex };
  signer: Es256Signer;
  holderJwk: P256Jwk;
  appUrl: string;
  now?: Date;
}): Promise<IssuedCredential> {
  const parsed = employmentRecordSchema.safeParse(args.record);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Los datos laborales no son válidos (${problems.join('; ')})`);
  }
  const record = parsed.data;
  const { did, keyId } = args.issuer;
  const claims = claimsOf(record);

  const disclosures = Object.entries(claims).map(([name, value]) => makeDisclosure(name, value));
  const iat = Math.floor((args.now ?? new Date()).getTime() / 1000);
  const exp = record.endDate === undefined ? iat + VALIDITY_SECONDS : null;

  const header = { alg: 'ES256', typ: 'vc+sd-jwt', cty: 'vc', kid: `${did}#${keyId}` };
  const payload = {
    '@context': ['https://www.w3.org/ns/credentials/v2', `${args.appUrl}/contexts/constancia-v1.jsonld`],
    type: ['VerifiableCredential', 'EmploymentCredential'],
    issuer: did,
    validFrom: isoSeconds(iat),
    ...(exp !== null && { validUntil: isoSeconds(exp) }),
    credentialSubject: { type: 'Employee', _sd: disclosures.map((d) => d.digest).sort() },
    iss: did,
    iat,
    ...(exp !== null && { exp }),
    cnf: { jwk: args.holderJwk },
    _sd_alg: 'sha-256',
  };

  const issuerJwt = await signJws(header, payload, args.signer);
  return {
    sdJwt: `${issuerJwt}~${disclosures.map((d) => d.disclosure).join('~')}~`,
    issuerJwt,
    credentialHash: credentialHashOf(issuerJwt),
    did,
    account: did.split(':')[3] as Address,
    keyId,
    validUntil: exp === null ? null : isoSeconds(exp),
    claims,
  };
}
