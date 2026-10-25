import { describe, expect, it } from 'vitest';
import { generateHolderKey } from '../credential/keys';
import { buildHistoryPdf, buildSheetPdf, isPdf, readPdfPayload } from './pdf';

describe('constancia pdf', () => {
  it('round-trips the token through the PDF metadata', async () => {
    const holderKey = await generateHolderKey();
    const sdJwt = `eyJhbGciOiJFUzI1NiJ9.${'a'.repeat(3000)}.sig~WyJzYWx0Il0~`;
    const bytes = await buildSheetPdf(
      {
        kicker: 'prueba',
        title: 'Constancia de trabajo',
        subject: 'María Fernanda Rojas ő',
        issuer: { name: 'Empresa Demo', did: 'did:constancia:11155111:0x00' },
        rows: [
          { label: 'Cargo', value: 'Analista' },
          { label: 'Salario', value: null },
        ],
        notes: ['nota'],
        footer: ['hash 0x1'],
      },
      { type: 'credential', sdJwt, holderKey },
    );
    expect(isPdf(bytes)).toBe(true);
    expect(await readPdfPayload(bytes)).toEqual({ type: 'credential', sdJwt, holderKey });
  });

  it('round-trips a history and rejects foreign PDFs', async () => {
    const bytes = await buildHistoryPdf(
      {
        subject: 'A B',
        entries: [{ employer: 'X', jobTitle: 'Y', period: '2020 - 2021' }],
        footer: [],
        notes: [],
      },
      { type: 'cv', cv: '{"type":"constancia-cv"}' },
    );
    expect(await readPdfPayload(bytes)).toEqual({ type: 'cv', cv: '{"type":"constancia-cv"}' });
    expect(await readPdfPayload(new TextEncoder().encode('%PDF-1.4 nope'))).toBeNull();
  });
});
