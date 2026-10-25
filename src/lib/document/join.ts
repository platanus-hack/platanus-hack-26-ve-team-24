// Unificar: several credentials of the same person become one sealed history.
import { signerFromPrivateJwk } from '../credential/keys';
import { buildVerifiedCv } from '../credential/passport';
import type { ClaimName, DisclosedClaims } from '../credential/types';
import type { CredentialFile } from './credential-file';
import { historyPdf, subjectOf } from './documents';

const MAX_ENTRIES = 12;

/** What a history shows by default: the career, not the pay. */
export const HISTORY_DEFAULT_REVEAL: ClaimName[] = [
  'givenName',
  'familyName',
  'jobTitle',
  'department',
  'employmentType',
  'startDate',
  'endDate',
  'employedNow',
  'workCountry',
];

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]/gi, '')
    .toLowerCase();

const personKey = (claims: DisclosedClaims): string =>
  [claims.nationalId, claims.givenName, claims.familyName].map(normalize).join('|');

export type SamePerson = { ok: true; subject: string } | { ok: false; reason: string };

/** The issuer wrote the same national ID and name on every credential, or they are not one person. */
export function checkSamePerson(files: CredentialFile[]): SamePerson {
  const [first, ...rest] = files;
  if (!first) return { ok: false, reason: 'Carga al menos una constancia' };
  const subject = subjectOf(first.claims) ?? 'Titular';
  for (const other of rest) {
    if (personKey(other.claims) !== personKey(first.claims)) {
      return {
        ok: false,
        reason: `«${other.name}» no es de la misma persona que «${first.name}»: la cédula o el nombre no coinciden. Un historial solo une constancias de una persona.`,
      };
    }
  }
  return { ok: true, subject };
}

export const dedupe = (files: CredentialFile[]): CredentialFile[] => [
  ...new Map(files.map((file) => [file.credentialHash, file])).values(),
];

const startOf = (file: CredentialFile): string => String(file.claims.startDate ?? '');

export async function buildHistory(args: {
  files: { file: CredentialFile; employer: string }[];
  reveal: ClaimName[];
  aud: string;
  ttlSec: number;
}): Promise<{ pdf: Uint8Array; entries: number }> {
  const sorted = args.files.toSorted((a, b) => startOf(a.file).localeCompare(startOf(b.file)));
  if (sorted.length > MAX_ENTRIES)
    throw new Error(`Un historial une hasta ${MAX_ENTRIES} constancias`);
  const subject = subjectOf(sorted[0].file.claims) ?? 'Titular';

  const cv = await buildVerifiedCv({
    items: await Promise.all(
      sorted.map(async ({ file }) => ({
        credential: file.sdJwt,
        holder: await signerFromPrivateJwk(file.holderKey),
        reveal: args.reveal,
      })),
    ),
    aud: args.aud,
    ttlSec: args.ttlSec,
  });

  const shown = (claims: DisclosedClaims): DisclosedClaims =>
    Object.fromEntries(
      Object.entries(claims).filter(([name]) => args.reveal.includes(name as ClaimName)),
    );
  const pdf = await historyPdf({
    cv,
    subject:
      args.reveal.includes('givenName') || args.reveal.includes('familyName')
        ? subject
        : 'Titular reservado',
    entries: sorted.map(({ file, employer }) => ({ employer, claims: shown(file.claims) })),
    aud: args.aud,
  });
  return { pdf, entries: sorted.length };
}
