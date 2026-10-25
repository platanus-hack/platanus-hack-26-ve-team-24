import { describe, expect, test } from 'vitest';
import { formatAge, formatBlock, shortHash } from './format';

describe('ledger formatting', () => {
  test('shortHash keeps short values and ellipsises long ones', () => {
    expect(shortHash('0x1f9a')).toBe('0x1f9a');
    expect(shortHash(`0x${'ab'.repeat(32)}`)).toBe('0xabababab…abababab');
  });

  test('formatBlock groups thousands', () => {
    expect(formatBlock(7_000_123)).toBe('Bloque 7.000.123');
  });

  test('formatAge steps through seconds, minutes, hours and days', () => {
    const now = 1_800_000_000_000;
    const ago = (seconds: number) => formatAge(now / 1000 - seconds, now);
    expect(ago(5)).toBe('hace 5 s');
    expect(ago(120)).toBe('hace 2 min');
    expect(ago(3 * 3600)).toBe('hace 3 h');
    expect(ago(2 * 86_400)).toBe('hace 2 d');
    expect(formatAge(now / 1000 + 30, now)).toBe('hace 0 s');
  });
});
