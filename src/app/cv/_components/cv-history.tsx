'use client';

import { useState } from 'react';
import { Timeline } from '@/components/ui/timeline';
import type { CareerTimeline } from '@/lib/credential/passport';
import { careerAxis, formatMonths, type CareerAxis } from '@/lib/vault/cv-axis';
import { timelineItems } from '@/lib/vault/cv-entries';

const percent = (fraction: number) => `${(fraction * 100).toFixed(3)}%`;

/** One horizontal time axis: each bar's length is the job's exact duration, gaps stay empty. */
function DurationAxis({ axis }: { axis: CareerAxis }) {
  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="text-small text-ink-muted">
        Cada barra mide exactamente lo que duró el empleo, sobre el mismo eje de tiempo.
      </figcaption>
      <ol className="flex flex-col gap-4">
        {axis.bars.map((bar) => (
          <li key={bar.id}>
            <p className="flex flex-wrap justify-between gap-x-4 text-small">
              <span className="font-bold">{bar.employer}</span>
              <span className="tnum">{formatMonths(bar.months)}</span>
            </p>
            <div className="relative h-6 border-b-2 border-rule">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 bg-ink"
                style={{ left: percent(bar.offset), width: percent(bar.length) }}
              />
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="relative h-7 overflow-hidden border-t-2 border-ink">
        {axis.years.map((tick) => (
          <span
            key={tick.year}
            className="tnum absolute top-0 border-l-2 border-ink pt-1 pl-1 text-small text-ink-muted"
            style={{ left: percent(tick.offset) }}
          >
            {tick.year}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** The verified history as the reader sees it: durations to scale, then the detailed timeline. */
export function CvHistory({ timeline }: { timeline: CareerTimeline }) {
  const [now] = useState(() => Date.now());
  const axis = careerAxis(timeline, now);
  return (
    <div className="flex flex-col gap-10">
      {axis.bars.length > 0 && <DurationAxis axis={axis} />}
      <Timeline items={timelineItems(timeline)} gaps={timeline.gaps} overlaps={timeline.overlaps} />
    </div>
  );
}
