import type { ClaimView } from '@/components/ui/claim-list';
import { REVEAL_TEMPLATES } from '@/lib/credential/present';
import type { ClaimName, DisclosedClaims } from '@/lib/credential/types';
import type { CheckCode } from '@/lib/credential/verify';

export const CHECK_LABELS: Record<CheckCode, string> = {
  TOKEN: 'Constancia',
  ISSUER: 'Acreditado',
  SIGNATURE: 'Firma',
  HOLDER: 'Titular',
  LEDGER: 'Registro',
};

export const CLAIM_LABELS: Record<ClaimName, string> = {
  givenName: 'Nombre',
  familyName: 'Apellido',
  nationalId: 'Cédula de identidad',
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

export const formatClaim = (value: DisclosedClaims[ClaimName]): string =>
  typeof value === 'boolean'
    ? value
      ? 'Sí'
      : 'No'
    : (EMPLOYMENT_TYPES[String(value)] ?? String(value));

/** Every claim the certificate holds, read-only: the holder may see all of them. */
export function ownClaimViews(claims: DisclosedClaims): ClaimView[] {
  return REVEAL_TEMPLATES.full
    .filter((name) => claims[name] !== undefined)
    .map((name) => ({
      name,
      label: CLAIM_LABELS[name],
      value: formatClaim(claims[name]),
      state: 'shown' as const,
    }));
}
