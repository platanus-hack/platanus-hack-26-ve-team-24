import { describe, expect, it } from 'vitest';
import type { CredentialFile } from './credential-file';
import { checkSamePerson, dedupe } from './join';

const file = (name: string, claims: CredentialFile['claims'], hash = name): CredentialFile => ({
  name,
  sdJwt: '',
  holderKey: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' },
  claims,
  issuer: 'did:x',
  credentialHash: hash,
});

const maria = { givenName: 'María', familyName: 'Rojas', nationalId: 'V-24.567.890' };

describe('checkSamePerson', () => {
  it('accepts the same person written differently', () => {
    const result = checkSamePerson([
      file('a.pdf', maria),
      file('b.pdf', { ...maria, givenName: 'maria', nationalId: 'V24567890' }),
    ]);
    expect(result).toEqual({ ok: true, subject: 'María Rojas' });
  });

  it('rejects another person and names the file', () => {
    const result = checkSamePerson([
      file('a.pdf', maria),
      file('b.pdf', { ...maria, nationalId: 'V-1' }),
    ]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain('b.pdf');
  });

  it('needs at least one credential', () => {
    expect(checkSamePerson([]).ok).toBe(false);
  });
});

describe('dedupe', () => {
  it('drops the same credential attached twice', () => {
    expect(
      dedupe([file('a.pdf', maria, 'h'), file('copy.pdf', maria, 'h'), file('b.pdf', maria, 'k')]),
    ).toHaveLength(2);
  });
});
