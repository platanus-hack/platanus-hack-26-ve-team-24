'use client';

import { useEffect, useState } from 'react';
import type { Verdict } from '@/lib/credential/verify';
import { verifyInVault } from './browser';

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

/** Live check of one certificate against the ledger. */
export function useCertificateVerdict(sdJwt: string): Verdict | null {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const result = await verifyInVault(sdJwt);
      if (live) setVerdict(result);
    })();
    return () => {
      live = false;
    };
  }, [sdJwt]);
  return verdict;
}
