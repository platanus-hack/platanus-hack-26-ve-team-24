import type { RowStatus } from '@/components/ui/check-list';
import type { CheckCode } from '@/lib/credential/verify';
import { CHECK_LABELS } from './types';
import type { RowView } from './types';

export const VERDICT_TITLE = {
  AUTHENTIC: 'VÁLIDA',
  NOT_AUTHENTIC: 'NO VÁLIDA',
  UNAVAILABLE: 'NO SE PUEDE VERIFICAR AHORA',
} as const;

export const failureReason = (failedAt: CheckCode, reason: string): string =>
  `Falló la comprobación «${CHECK_LABELS[failedAt]}». ${reason}.`;

export const unavailableReason = (reason: string): string => `${reason}.`;

/** Un segmento del sello por comprobación, en orden. */
export const statusesOf = (rows: readonly RowView[]): RowStatus[] => rows.map((row) => row.status);

/** The Titular check still runs, but its row is not listed unless it is the one that failed. */
export const visibleRows = (rows: readonly RowView[]): RowView[] =>
  rows.filter((row) => row.code !== 'HOLDER' || row.status === 'FAILED');
