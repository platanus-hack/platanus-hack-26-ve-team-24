import type { CSSProperties } from 'react';
import { ROW_STATUS } from './check-list';
import type { RowStatus } from './check-list';

export const SEAL_CHECKS = ['Constancia', 'Acreditado', 'Firma', 'Titular', 'Registro'] as const;

// a C on a 6×6 module grid, drawn in check order: beak, top, left upper, left lower, bottom
const SEGMENT_AREAS = ['2 / 6 / 3 / 7', '1 / 2 / 2 / 7', '1 / 1 / 4 / 2', '4 / 1 / 7 / 2', '6 / 2 / 7 / 7'];

// state is never colour alone: filled, outlined, hatched or dashed, and the legend prints the word
const SEGMENT: Record<RowStatus, string> = {
  PENDING: 'border-current',
  CHECKING: 'border-current bg-current',
  VERIFIED: 'border-current bg-current',
  DONE: 'border-current bg-current',
  FAILED: 'seal-open border-current',
  UNAVAILABLE: 'border-dashed border-current',
  NOT_EXAMINED: 'border-dashed border-current opacity-40',
};

const ALL_PENDING: RowStatus[] = ['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING'];

/**
 * The signature mark: one segment per check. Segments change state in place and never reorder.
 * Colour comes from `currentColor`, so the parent's text colour paints the mark.
 * `stagger` delays each segment's change by its index, for the closing sequence.
 */
export function Seal({
  statuses = ALL_PENDING,
  size = 160,
  stagger = 0,
  className = '',
}: {
  statuses?: readonly RowStatus[];
  size?: number;
  stagger?: number;
  className?: string;
}) {
  const stroke = Math.max(2, Math.round(size / 32));
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 grid-cols-6 grid-rows-6 ${className}`}
      style={
        {
          width: size,
          height: size,
          gap: Math.round(size / 40),
          '--seal-stagger': `${stagger}ms`,
        } as CSSProperties
      }
    >
      {SEGMENT_AREAS.map((area, index) => {
        const status = statuses[index] ?? 'PENDING';
        return (
          <span
            key={area}
            data-status={status}
            className={`seal-seg ${SEGMENT[status]}`}
            style={{ gridArea: area, borderWidth: stroke, '--seg-i': index } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

export function SealLegend({
  statuses = ALL_PENDING,
  labels = SEAL_CHECKS,
}: {
  statuses?: readonly RowStatus[];
  labels?: readonly string[];
}) {
  return (
    <ol className="grid grid-cols-5 gap-2">
      {labels.map((label, index) => {
        const status = statuses[index] ?? 'PENDING';
        return (
          <li key={label} className="min-w-0 border-t-4 border-current pt-2 text-small">
            <span className="tnum block font-bold">{index + 1}</span>
            <span className="block font-bold break-words hyphens-auto">{label}</span>
            {status === 'PENDING' ? null : (
              <span className="block text-small uppercase tracking-wide">{ROW_STATUS[status]}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
