import { Fragment } from 'react';
import { Chip, ROW_STATUS } from './check-list';
import type { RowStatus } from './check-list';

export interface TimelineItem {
  id: string;
  employer: string;
  title?: string;
  start?: string;
  // oxlint-disable-next-line typescript/no-redundant-type-constituents -- contract §11 signature, 'present' is a readable marker
  end?: string | 'present';
  status: RowStatus;
  note?: string;
}

interface Gap {
  from: string;
  to: string;
  months: number;
}

interface Overlap {
  a: string;
  b: string;
}

// the spine runs through the centre of the 36px chip column
const SPINE = 'absolute inset-y-0 left-[1.125rem] w-[3px] -translate-x-1/2 bg-ink';
const SECOND_SPINE = 'absolute inset-y-0 left-[calc(1.125rem+6px)] w-[3px] -translate-x-1/2 bg-ink';

// a gap follows the entry that ends where it starts; without a match it trails the list
function gapAnchor(items: TimelineItem[], gap: Gap): number {
  const index = items.findIndex((item) => item.end === gap.from);
  return index === -1 ? items.length - 1 : index;
}

function overlapAnchor(items: TimelineItem[], overlap: Overlap): number {
  const last = Math.max(
    ...[overlap.a, overlap.b].map((id) => items.findIndex((item) => item.id === id)),
  );
  return last < 0 ? items.length - 1 : last;
}

function TimelineRow({ item, doubled }: { item: TimelineItem; doubled: boolean }) {
  const dates = [item.start, item.end].filter(Boolean).join(' – ');
  return (
    <li data-status={item.status} className="relative grid grid-cols-[2.25rem_1fr] gap-x-4 pb-8">
      <span aria-hidden="true" className={SPINE} />
      {doubled ? <span aria-hidden="true" className={SECOND_SPINE} /> : null}
      <div className="relative">
        <Chip status={item.status} />
      </div>
      <div>
        <p className="text-title font-bold">{item.employer}</p>
        {item.title ? <p className="text-body">{item.title}</p> : null}
        {dates ? <p className="text-small text-ink-muted">{dates}</p> : null}
        {item.note ? <p className="text-small text-ink-muted">{item.note}</p> : null}
        <p className="mt-2 text-small font-bold tracking-wide uppercase">
          {ROW_STATUS[item.status]}
        </p>
      </div>
    </li>
  );
}

function GapRow({ gap }: { gap: Gap }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-x-4 py-2">
      <span aria-hidden="true" className="gap-hatch min-h-12 border-2 border-ink" />
      <p className="self-center text-small font-bold">
        Sin empleo · {gap.months} {gap.months === 1 ? 'mes' : 'meses'}{' '}
        <span className="font-normal text-ink-muted">
          ({gap.from} – {gap.to})
        </span>
      </p>
    </li>
  );
}

function OverlapRow({ label }: { label: string }) {
  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-x-4 pb-8">
      <span aria-hidden="true" className={SPINE} />
      <span aria-hidden="true" className={SECOND_SPINE} />
      <p className="col-start-2 self-center text-small font-bold">Solapamiento · {label}</p>
    </li>
  );
}

// overlaps refer to item ids
export function Timeline({
  items,
  gaps = [],
  overlaps = [],
}: {
  items: TimelineItem[];
  gaps?: Gap[];
  overlaps?: Overlap[];
}) {
  const overlapped = new Set(overlaps.flatMap((overlap) => [overlap.a, overlap.b]));
  const employerOf = (id: string) => items.find((item) => item.id === id)?.employer ?? id;

  return (
    <ol>
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <TimelineRow item={item} doubled={overlapped.has(item.id)} />
          {gaps
            .filter((gap) => gapAnchor(items, gap) === index)
            .map((gap) => (
              <GapRow key={`${gap.from}-${gap.to}`} gap={gap} />
            ))}
          {overlaps
            .filter((overlap) => overlapAnchor(items, overlap) === index)
            .map((overlap) => (
              <OverlapRow
                key={`${overlap.a}-${overlap.b}`}
                label={`${employerOf(overlap.a)} y ${employerOf(overlap.b)}`}
              />
            ))}
        </Fragment>
      ))}
    </ol>
  );
}
