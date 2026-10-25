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
  .min(2, 'Usa al menos 2 caracteres')
  .refine(
    (value) => byteLength(value) <= MAX_ORG_NAME_BYTES,
    'Usa 64 bytes o menos: los caracteres con acento cuentan doble',
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
        headline: 'Esperando al consorcio',
        detail: `${issuer.approvals} de ${issuer.quorum} miembros han aprobado`,
      };
    case 'ACTIVE':
      return {
        tone: 'active',
        headline: 'Acreditada',
        detail: 'Tu organización ya puede emitir constancias.',
      };
    case 'SUSPENDED':
      return {
        tone: 'paused',
        headline: 'En pausa por el consorcio',
        detail: 'Las constancias que ya emitiste siguen en el registro, pero no puedes emitir nuevas. Contacta al consorcio para reanudar.',
      };
    case 'NONE':
    case undefined:
      return {
        tone: 'idle',
        headline: 'Aún no has solicitado la acreditación',
        detail: 'Pide al consorcio que acredite a tu organización.',
      };
  }
}
