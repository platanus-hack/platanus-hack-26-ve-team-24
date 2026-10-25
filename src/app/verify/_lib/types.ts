import type { RowStatus } from '@/components/ui/check-list';
import type { CheckCode } from '@/lib/credential/verify';

export type InputKind = 'presentation' | 'cv';
export type InputOrigin = 'link' | 'file' | 'paste' | 'sample';

export interface LoadedInput {
  text: string;
  kind: InputKind;
  origin: InputOrigin;
  shareId?: string; // viene de un enlace para compartir: sale el id, nunca la clave
}

/** La petición exacta que hizo la consulta, para el recibo «Lo que salió de tu navegador». */
export interface RecordedRequest {
  url: string;
  method: 'POST';
  body: string;
  bytes: number;
}

export interface RowView {
  code: CheckCode;
  label: string;
  status: RowStatus;
  measured?: string;
  detail?: string;
}

export const CHECK_LABELS: Record<CheckCode, string> = {
  TOKEN: 'Constancia',
  ISSUER: 'Acreditado',
  SIGNATURE: 'Firma',
  HOLDER: 'Titular',
  LEDGER: 'Registro',
};

export const MAX_INPUT_BYTES = 256 * 1024;
