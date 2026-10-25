import { describe, expect, it } from 'vitest';
import { DEMO_DIRECTORY, parseEntry } from './directory';
import { emptyFields, fieldsFromRecord, recordFromFields } from './record-fields';

describe('directory', () => {
  it('ships four valid, distinct demo employees including María (E-1042, current)', () => {
    expect(DEMO_DIRECTORY).toHaveLength(4);
    expect(new Set(DEMO_DIRECTORY.map((e) => e.employeeRef)).size).toBe(4);
    for (const entry of DEMO_DIRECTORY) expect(() => parseEntry(entry)).not.toThrow();
    const maria = DEMO_DIRECTORY.find((e) => e.employeeRef === 'E-1042');
    expect(maria?.record.givenName).toContain('María');
    expect(maria?.record.endDate).toBeUndefined();
  });

  it('rejects an invalid record before it is stored', () => {
    const [first] = DEMO_DIRECTORY;
    expect(() => parseEntry({ ...first!, record: { ...first!.record, endDate: '2000-01-01' } })).toThrow();
    expect(() => parseEntry({ ...first!, employeeRef: ' ' })).toThrow();
  });

  it('stores the employee number upper case so a typed lower case still matches', () => {
    const [first] = DEMO_DIRECTORY;
    expect(parseEntry({ ...first!, employeeRef: ' e-1042 ' }).employeeRef).toBe('E-1042');
  });
});

describe('record fields', () => {
  it('round-trips a record through the form strings', () => {
    for (const { record } of DEMO_DIRECTORY) {
      const parsed = recordFromFields(fieldsFromRecord(record));
      expect(parsed).toEqual({ ok: true, record });
    }
  });

  it('reports errors per field', () => {
    const result = recordFromFields({ ...emptyFields(), startDate: '2999-01-01' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.givenName).toBeDefined();
      expect(result.errors.startDate).toMatch(/future/);
    }
  });
});
