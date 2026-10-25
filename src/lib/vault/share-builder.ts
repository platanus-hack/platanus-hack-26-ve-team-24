import type { ClaimView } from '@/components/ui/claim-list';
import { REVEAL_TEMPLATES } from '@/lib/credential/present';
import type { ClaimName, DisclosedClaims } from '@/lib/credential/types';
import { CLAIM_LABELS, formatClaim } from './claims';

export type TemplateName = keyof typeof REVEAL_TEMPLATES;

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  employment: 'Prueba de empleo',
  income: 'Prueba de ingresos',
  role: 'Cargo',
  identity: 'Identidad',
  full: 'Todo',
};

export const EXPIRIES = [
  { label: '1 hora', ttlSec: 3600 },
  { label: '24 horas', ttlSec: 86_400 },
  { label: '7 días', ttlSec: 604_800 },
] as const;

export const MAX_AUDIENCE = 40;

/** Browser only. The link base: the configured public URL, else the page's own origin. */
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

/** The claims a template reveals, limited to what this certificate actually holds. */
export function templateReveal(template: TemplateName, claims: DisclosedClaims): ClaimName[] {
  return REVEAL_TEMPLATES[template].filter((name) => claims[name] !== undefined);
}

export const revealsIdentity = (reveal: ClaimName[]) => reveal.includes('nationalId');

/** Every held claim as a toggle (builder) or as the reader would see it (preview). */
export function claimViews(
  claims: DisclosedClaims,
  reveal: ClaimName[],
  mode: 'toggle' | 'preview',
): ClaimView[] {
  return REVEAL_TEMPLATES.full
    .filter((name) => claims[name] !== undefined)
    .map((name) => {
      const on = reveal.includes(name);
      const state: ClaimView['state'] =
        mode === 'toggle' ? (on ? 'on' : 'off') : on ? 'shown' : 'hidden';
      return {
        name,
        label: mode === 'preview' && !on ? 'No se muestra' : CLAIM_LABELS[name],
        value: on ? formatClaim(claims[name]) : undefined,
        state,
      };
    });
}

export function toggleClaim(reveal: ClaimName[], name: ClaimName, next: boolean): ClaimName[] {
  const without = reveal.filter((claim) => claim !== name);
  return next ? [...without, name] : without;
}
