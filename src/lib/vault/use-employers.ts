'use client';

import { useEffect, useState } from 'react';
import { fetchNetworkState } from '@/lib/ledger/gateway-client';
import type { IssuerInfo } from '@/lib/ledger/types';

export type EmployerList =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; issuers: IssuerInfo[] };

/** Accredited employers as the consortium lists them. */
export function useEmployers(): EmployerList {
  const [list, setList] = useState<EmployerList>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const state = await fetchNetworkState();
        if (live) {
          setList({ status: 'ready', issuers: state.issuers.filter((i) => i.status === 'ACTIVE') });
        }
      } catch {
        if (live) setList({ status: 'error' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return list;
}

export function employerName(list: EmployerList, account: string): string {
  if (list.status !== 'ready') return 'your employer';
  return list.issuers.find((issuer) => issuer.account === account)?.name ?? 'your employer';
}
