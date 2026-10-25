import { Chip, type RowStatus } from '@/components/ui/check-list';
import type { IssuerInfo } from '@/lib/ledger/types';

type StepState = 'done' | 'current' | 'waiting' | 'paused' | 'pending';

const LABELS = ['Nombra tu organización', 'Solicita la acreditación', 'El consorcio te acredita'];

// cada estado lleva palabra, marca y color
const STATE: Record<StepState, { chip: RowStatus; word: string }> = {
  done: { chip: 'DONE', word: 'Listo' },
  current: { chip: 'PENDING', word: 'Tu turno' },
  waiting: { chip: 'CHECKING', word: 'Esperando' },
  paused: { chip: 'FAILED', word: 'En pausa' },
  pending: { chip: 'NOT_EXAMINED', word: 'Pendiente' },
};

export function stepStates(hasIdentity: boolean, issuer: IssuerInfo | undefined): StepState[] {
  if (!hasIdentity) return ['current', 'pending', 'pending'];
  switch (issuer?.status) {
    case 'ACTIVE':
      return ['done', 'done', 'done'];
    case 'SUSPENDED':
      return ['done', 'done', 'paused'];
    case 'PENDING':
      return ['done', 'done', 'waiting'];
    case 'NONE':
    case undefined:
      return ['done', 'current', 'pending'];
  }
}

export function OnboardingSteps({ states }: { states: StepState[] }) {
  return (
    <ol aria-label="Pasos" className="grid gap-6 sm:grid-cols-3">
      {LABELS.map((label, index) => {
        const state = states[index] ?? 'pending';
        const current = state === 'current';
        return (
          <li
            key={label}
            aria-current={current ? 'step' : undefined}
            className={`flex items-start gap-4 border-ink pt-4 ${current ? 'border-t-4' : 'border-t-2'}`}
          >
            <Chip status={STATE[state].chip} />
            <p>
              <span className="block font-bold">
                <span className="tnum">{index + 1}</span> {label}
              </span>
              <span className="text-small font-bold uppercase tracking-wide">{STATE[state].word}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
