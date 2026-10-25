import type { RowStatus } from '@/components/ui/check-list';
import type { IssuerInfo, IssuerStatus, NetworkState } from '@/lib/ledger/types';

const sameAccount = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// las huellas las ancla un empleador; los votos, un miembro
export function nameOf(state: NetworkState, account: string): string {
  const named = [...state.issuers, ...state.members].find(
    (entry) => entry.name !== '' && sameAccount(entry.account, account),
  );
  return named?.name ?? 'Desconocido';
}

// cada estado lleva palabra + marca + color (la marca la dibuja Chip)
const ISSUER_CHIP: Record<IssuerStatus, RowStatus> = {
  ACTIVE: 'VERIFIED',
  PENDING: 'PENDING',
  SUSPENDED: 'FAILED',
  NONE: 'NOT_EXAMINED',
};

const ISSUER_LABEL: Record<IssuerStatus, string> = {
  ACTIVE: 'Acreditado',
  PENDING: 'Pendiente',
  SUSPENDED: 'Suspendido',
  NONE: 'Sin solicitud',
};

export function issuerStatusView(issuer: IssuerInfo): { chip: RowStatus; label: string } {
  const label = ISSUER_LABEL[issuer.status];
  return {
    chip: ISSUER_CHIP[issuer.status],
    label: issuer.status === 'PENDING' ? `${label} ${issuer.approvals}/${issuer.quorum}` : label,
  };
}

export { formatAge as ageLabel, formatBlock, formatBlockNumber } from '@/lib/ledger/format';
