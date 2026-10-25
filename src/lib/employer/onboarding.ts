import { z } from 'zod';
import type { IssuerInfo } from '../ledger/types';
import { EMPLOYER_SIGNER_PREFIX } from './identity';

/** The Ledger contract stores the name on chain and caps it at 64 bytes, not characters. */
export const MAX_ORG_NAME_BYTES = 64;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

/** FNV-1a over the exact name, so a renamed organization never reuses another one's key. */
function nameFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export const orgNameSchema = z
  .string()
  .trim()
  .min(2, 'Use at least 2 characters')
  .refine(
    (value) => byteLength(value) <= MAX_ORG_NAME_BYTES,
    'Use 64 bytes or fewer: accented characters count double',
  );

export const signerNameFor = (orgName: string): string => {
  const name = orgName.trim();
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // The suffix keeps two names that slugify the same from sharing one device key.
  return `${EMPLOYER_SIGNER_PREFIX}${slug || 'organization'}-${nameFingerprint(name)}`;
};

export interface AccreditationView {
  tone: 'idle' | 'waiting' | 'active' | 'paused';
  headline: string;
  detail: string;
}

export function accreditationView(issuer: IssuerInfo | undefined): AccreditationView {
  switch (issuer?.status) {
    case 'PENDING':
      return {
        tone: 'waiting',
        headline: 'Waiting for the consortium',
        detail: `${issuer.approvals} of ${issuer.quorum} members have approved`,
      };
    case 'ACTIVE':
      return {
        tone: 'active',
        headline: 'Accredited',
        detail: 'Your organization can now issue certificates.',
      };
    case 'SUSPENDED':
      return {
        tone: 'paused',
        headline: 'Paused by the consortium',
        detail: 'Certificates you already issued stay on record, but new ones are on hold. Contact the consortium to resume.',
      };
    case 'NONE':
    case undefined:
      return {
        tone: 'idle',
        headline: 'Not applied yet',
        detail: 'Ask the consortium to accredit your organization.',
      };
  }
}
