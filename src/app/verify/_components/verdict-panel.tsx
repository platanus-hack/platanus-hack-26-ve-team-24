import { Button, LinkButton } from '@/components/ui/button';
import type { RowStatus } from '@/components/ui/check-list';
import { ClaimList, type ClaimView } from '@/components/ui/claim-list';
import { Mono } from '@/components/ui/mono';
import { Panel } from '@/components/ui/panel';
import { Verdict as VerdictBand } from '@/components/ui/verdict';
import type { ClaimName, DisclosedClaims } from '@/lib/credential/types';
import type { Verdict } from '@/lib/credential/verify';
import { failureReason, unavailableReason, VERDICT_TITLE } from '../_lib/verdict-copy';

type AuthenticVerdict = Extract<Verdict, { kind: 'AUTHENTIC' }>;

export const CLAIM_LABELS: Record<ClaimName, string> = {
  givenName: 'Nombre',
  familyName: 'Apellido',
  nationalId: 'Documento de identidad',
  jobTitle: 'Cargo',
  department: 'Departamento',
  employmentType: 'Tipo de empleo',
  startDate: 'Fecha de ingreso',
  endDate: 'Fecha de egreso',
  employedNow: 'Trabaja actualmente',
  workCountry: 'País de trabajo',
  salaryMonthlyUsd: 'Salario mensual (USD)',
  salaryBand: 'Rango salarial (USD/mes)',
};

const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Medio tiempo',
  CONTRACT: 'Por contrato',
};

function reasonOf(verdict: Verdict): string | undefined {
  if (verdict.kind === 'NOT_AUTHENTIC') return failureReason(verdict.failedAt, verdict.reason);
  if (verdict.kind === 'UNAVAILABLE') return unavailableReason(verdict.reason);
  return undefined;
}

function formatValue(value: DisclosedClaims[ClaimName]): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return EMPLOYMENT_TYPES[String(value)] ?? String(value);
}

function hiddenCaption(count: number): string {
  return count === 1
    ? 'El titular mantiene 1 dato más oculto'
    : `El titular mantiene ${count} datos más ocultos`;
}

function claimRows(claims: DisclosedClaims, hiddenCount: number): ClaimView[] {
  const shown = (Object.keys(claims) as ClaimName[]).map(
    (name): ClaimView => ({
      name,
      label: CLAIM_LABELS[name],
      value: formatValue(claims[name]),
      state: 'shown',
    }),
  );
  const hidden = Array.from(
    { length: hiddenCount },
    (_, index): ClaimView => ({ name: `hidden-${index}`, label: 'No se muestra', state: 'hidden' }),
  );
  return [...shown, ...hidden];
}

function HolderLines({ verdict }: { verdict: AuthenticVerdict }) {
  const { claims, keyBound, validUntil } = verdict;
  const namesDisclosed = claims.givenName !== undefined || claims.familyName !== undefined;
  return (
    <div className="mt-6 flex flex-col gap-1 text-body">
      {keyBound ? (
        <p>
          {namesDisclosed
            ? 'Titular: vinculado a una clave'
            : 'Titular: vinculado a una clave, no a un nombre'}
        </p>
      ) : null}
      {validUntil ? <p>Válida hasta el {validUntil.slice(0, 10)}</p> : null}
    </div>
  );
}

export function IssuerPanel({ verdict }: { verdict: AuthenticVerdict }) {
  const { claims, hiddenCount, issuer } = verdict;
  return (
    <Panel title="Leído de la constancia firmada">
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-title font-bold">{issuer.name}</span>
        <Mono value={issuer.account} shorten />
      </p>
      <div className="mt-6">
        <ClaimList
          claims={claimRows(claims, hiddenCount)}
          caption={hiddenCount > 0 ? hiddenCaption(hiddenCount) : undefined}
        />
      </div>
      <HolderLines verdict={verdict} />
    </Panel>
  );
}

export function VerdictActions({ checking, onCheckAgain }: { checking: boolean; onCheckAgain: () => void }) {
  return (
    <div className="flex flex-wrap gap-4">
      <Button variant="secondary" disabled={checking} onClick={onCheckAgain}>
        Verificar de nuevo
      </Button>
      <LinkButton variant="quiet" href="/verify/lab">
        Intenta falsificarla
      </LinkButton>
    </div>
  );
}

export function VerdictPanel({
  verdict,
  statuses,
  onCheckAgain,
  checking,
}: {
  verdict: Verdict;
  statuses: readonly RowStatus[];
  onCheckAgain: () => void;
  checking: boolean;
}) {
  return (
    <div className="flex flex-col gap-12">
      <VerdictBand
        kind={verdict.kind}
        title={VERDICT_TITLE[verdict.kind]}
        reason={reasonOf(verdict)}
        statuses={statuses}
      />
      {verdict.kind === 'AUTHENTIC' ? <IssuerPanel verdict={verdict} /> : null}
      <VerdictActions checking={checking} onCheckAgain={onCheckAgain} />
    </div>
  );
}
