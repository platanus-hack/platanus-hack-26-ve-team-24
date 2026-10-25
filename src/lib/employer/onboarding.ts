import { z } from 'zod';
import type { IssuerInfo } from '../ledger/types';
import { EMPLOYER_SIGNER_PREFIX } from './identity';

export const orgNameSchema = z.string().trim().min(2, 'Usa al menos 2 caracteres').max(80, 'Usa 80 caracteres o menos');

export const signerNameFor = (orgName: string): string => {
  const slug = orgName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${EMPLOYER_SIGNER_PREFIX}${slug || 'organization'}`;
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
