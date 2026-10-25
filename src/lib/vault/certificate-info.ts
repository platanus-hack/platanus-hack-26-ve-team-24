import { decodePresentation, type DecodedPresentation } from '@/lib/credential/present';
import type { RequestKind, VaultCertificate } from './types';

export const KIND_LABEL: Record<RequestKind, string> = {
  CURRENT: 'Empleo actual',
  PAST: 'Empleo anterior',
};

export interface CertificateInfo {
  decoded: DecodedPresentation;
  issuedOn: string;
}

/** The holder owns the certificate, so every claim is decoded. */
export function certificateInfo(certificate: VaultCertificate): CertificateInfo {
  const decoded = decodePresentation(certificate.sdJwt);
  const validFrom = decoded.payload.validFrom;
  return { decoded, issuedOn: typeof validFrom === 'string' ? validFrom.slice(0, 10) : '' };
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
