import type { CareerTimeline } from '@/lib/credential/passport';

const DAY_MS = 86_400_000;
const AVERAGE_MONTH_DAYS = 30.4375;

export interface AxisBar {
  id: string;
  employer: string;
  months: number;
  /** Position and length as fractions of the whole axis: length is the exact duration. */
  offset: number;
  length: number;
}

export interface CareerAxis {
  bars: AxisBar[];
  years: { year: number; offset: number }[];
}

const monthsBetween = (start: number, end: number) =>
  Math.max(0, Math.round((end - start) / DAY_MS / AVERAGE_MONTH_DAYS));

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : '',
    rest > 0 || years === 0 ? `${rest} ${rest === 1 ? 'mes' : 'meses'}` : '',
  ].filter(Boolean);
  return parts.join(' y ');
}

/** Only entries with a readable start and a known end (or still employed) have a length. */
function spans(timeline: CareerTimeline, now: number) {
  return timeline.items.flatMap((item) => {
    if (item.datesHidden || !item.startDate) return [];
    const start = Date.parse(item.startDate);
    const end = item.endDate ? Date.parse(item.endDate) : item.employedNow ? now : Number.NaN;
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return [];
    return [{ id: item.id, employer: item.employer, start, end }];
  });
}

/** One shared time axis for the whole history: every bar's length is its exact duration. */
export function careerAxis(timeline: CareerTimeline, now: number): CareerAxis {
  const dated = spans(timeline, now);
  if (dated.length === 0) return { bars: [], years: [] };
  const from = Math.min(...dated.map((span) => span.start));
  const to = Math.max(...dated.map((span) => span.end));
  const total = to - from;
  const fraction = (time: number) => (time - from) / total;

  const firstYear = new Date(from).getUTCFullYear() + 1;
  const lastYear = new Date(to).getUTCFullYear();
  const years = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    years.push({ year, offset: fraction(Date.UTC(year, 0, 1)) });
  }

  return {
    bars: dated.map((span) => ({
      id: span.id,
      employer: span.employer,
      months: monthsBetween(span.start, span.end),
      offset: fraction(span.start),
      length: fraction(span.end) - fraction(span.start),
    })),
    years,
  };
}
