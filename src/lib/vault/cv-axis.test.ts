import { describe, expect, it } from 'vitest';
import type { CareerTimeline } from '@/lib/credential/passport';
import { careerAxis, formatMonths } from './cv-axis';

const NOW = Date.UTC(2024, 0, 1);

const timeline = (items: Partial<CareerTimeline['items'][number]>[]): CareerTimeline => ({
  items: items.map((item, index) => ({ id: `e${index}`, employer: `Empresa ${index}`, datesHidden: false, ...item })),
  gaps: [],
  overlaps: [],
});

describe('careerAxis', () => {
  it('gives each entry a length proportional to its exact duration', () => {
    const axis = careerAxis(
      timeline([
        { startDate: '2020-01-01', endDate: '2021-01-01' },
        { startDate: '2021-01-01', employedNow: true },
      ]),
      NOW,
    );
    expect(axis.bars.map((bar) => bar.months)).toEqual([12, 36]);
    expect(axis.bars[0]!.offset).toBe(0);
    expect(axis.bars[1]!.length / axis.bars[0]!.length).toBeCloseTo(3, 1);
    expect(axis.years.map((tick) => tick.year)).toEqual([2021, 2022, 2023, 2024]);
  });

  it('leaves out entries whose length cannot be known', () => {
    const axis = careerAxis(
      timeline([{ startDate: '2020-01-01' }, { datesHidden: true }, { startDate: 'not a date', employedNow: true }]),
      NOW,
    );
    expect(axis.bars).toEqual([]);
  });
});

describe('formatMonths', () => {
  it('reads as years and months in Spanish', () => {
    expect(formatMonths(1)).toBe('1 mes');
    expect(formatMonths(12)).toBe('1 año');
    expect(formatMonths(29)).toBe('2 años y 5 meses');
    expect(formatMonths(0)).toBe('0 meses');
  });
});
