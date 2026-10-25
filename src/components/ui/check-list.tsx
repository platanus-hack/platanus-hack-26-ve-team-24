import type { ReactNode } from 'react';

export const ROW_STATUS = {
  PENDING: 'Pendiente',
  CHECKING: 'Comprobando…',
  VERIFIED: 'Verificado',
  FAILED: 'Falló',
  UNAVAILABLE: 'No disponible',
  NOT_EXAMINED: 'No examinado',
  DONE: 'Listo',
} as const;

export type RowStatus = keyof typeof ROW_STATUS;

// Chip = a small square. Interferes while CHECKING, resolves to a solid square + drawn mark + a word.
// State is never colour alone: each resolved chip has its own mark and the row prints the status word.
const CHIP: Record<RowStatus, string> = {
  PENDING: 'border-ink bg-paper',
  CHECKING: 'chip-checking border-ink bg-marigold',
  VERIFIED: 'border-ok bg-ok text-paper',
  FAILED: 'border-fail bg-fail text-paper',
  UNAVAILABLE: 'border-ink bg-marigold text-ink',
  NOT_EXAMINED: 'border-dashed border-ink-muted bg-paper text-ink-muted',
  DONE: 'border-ink bg-ink text-paper',
};

const WORD: Record<RowStatus, string> = {
  PENDING: 'text-ink-muted',
  CHECKING: 'text-ink',
  VERIFIED: 'text-ok',
  FAILED: 'text-fail',
  UNAVAILABLE: 'text-ink',
  NOT_EXAMINED: 'text-ink-muted',
  DONE: 'text-ink',
};

// square-capped strokes on a 20px grid, drawn, not glyphs
export const MARK: Partial<Record<RowStatus, string>> = {
  VERIFIED: 'M4 10.5 8.5 15 16 5.5',
  DONE: 'M4 10.5 8.5 15 16 5.5',
  FAILED: 'M5 5 15 15M15 5 5 15',
  UNAVAILABLE: 'M10 4.5v7M10 15.5v.01',
  NOT_EXAMINED: 'M5 10h10',
};

export function Chip({ status }: { status: RowStatus }) {
  const mark = MARK[status];
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 items-center justify-center border-2 ${CHIP[status]}`}
    >
      {mark ? (
        <svg
          viewBox="0 0 20 20"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d={mark} strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      ) : null}
    </span>
  );
}

export function CheckList({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title ? (
        <h2 className="mb-4 font-display text-title font-extrabold">
          {title}
        </h2>
      ) : null}
      <ol className="border-b-2 border-ink">{children}</ol>
    </section>
  );
}

export function CheckRow({
  index,
  label,
  status,
  measured,
  detail,
  href,
}: {
  index: number;
  label: string;
  status: RowStatus;
  measured?: string;
  detail?: string;
  href?: string;
}) {
  return (
    <li
      data-status={status}
      aria-current={status === 'CHECKING' ? 'step' : undefined}
      className="grid grid-cols-[2rem_2.25rem_1fr] items-start gap-x-4 gap-y-1 border-t-2 border-ink py-4 sm:grid-cols-[2rem_2.25rem_1fr_auto]"
    >
      <span className="tnum pt-1 text-body font-bold">{index}</span>
      <Chip status={status} />
      <div>
        <p className="text-title font-bold">{label}</p>
        {detail ? <p className="mt-1 max-w-[65ch] text-body text-ink-muted">{detail}</p> : null}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-small font-bold">
            Ver en el explorador
          </a>
        ) : null}
      </div>
      <div className="col-start-3 sm:col-start-4 sm:row-start-1 sm:text-right">
        <p className={`text-small font-bold uppercase tracking-wide ${WORD[status]}`}>
          {ROW_STATUS[status]}
        </p>
        {measured ? (
          <code className="block break-all text-small text-ink-muted">{measured}</code>
        ) : null}
      </div>
    </li>
  );
}
