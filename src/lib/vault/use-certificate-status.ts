import type { Verdict } from '@/lib/credential/verify';

export type CertificateStatus =
  | { state: 'checking' }
  | { state: 'verified' }
  | { state: 'revoked'; reason: string }
  | { state: 'failed'; reason: string }
  | { state: 'unavailable' };

export function statusOf(verdict: Verdict): CertificateStatus {
  if (verdict.kind === 'AUTHENTIC') return { state: 'verified' };
  if (verdict.kind === 'UNAVAILABLE') return { state: 'unavailable' };
  return verdict.failedAt === 'LEDGER'
    ? { state: 'revoked', reason: verdict.reason }
    : { state: 'failed', reason: verdict.reason };
}
