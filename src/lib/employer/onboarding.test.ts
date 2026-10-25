import { describe, expect, it } from 'vitest';
import type { IssuerInfo } from '../ledger/types';
import { accreditationView, orgNameSchema, signerNameFor } from './onboarding';

const issuer = (status: IssuerInfo['status'], approvals = 0): IssuerInfo => ({
  account: '0x0000000000000000000000000000000000000001',
  name: 'Demo',
  status,
  approvals,
  quorum: 2,
  accreditedAt: null,
});

describe('onboarding', () => {
  it('names the device key after the organization, with a stable suffix', () => {
    expect(signerNameFor('Orinoco Logística (demo)')).toMatch(/^employer:orinoco-logistica-demo-[0-9a-f]{8}$/);
    expect(signerNameFor('!!!')).toMatch(/^employer:organization-[0-9a-f]{8}$/);
    expect(signerNameFor('Demo Org')).toBe(signerNameFor('  Demo Org  '));
  });

  it('never gives two different organization names the same key', () => {
    const sameSlug = ['Acme S.A.', 'Acme SA', 'ACME S.A'].map(signerNameFor);
    expect(new Set(sameSlug).size).toBe(3);
  });

  it('validates the organization name against the ledger byte limit', () => {
    expect(orgNameSchema.safeParse('A').success).toBe(false);
    expect(orgNameSchema.safeParse('  Demo Org  ').data).toBe('Demo Org');
    expect(orgNameSchema.safeParse('x'.repeat(64)).success).toBe(true);
    expect(orgNameSchema.safeParse('x'.repeat(65)).success).toBe(false);
    // Every accented character is two bytes on chain.
    expect(orgNameSchema.safeParse('á'.repeat(33)).success).toBe(false);
  });

  it('describes each accreditation state', () => {
    expect(accreditationView(undefined).tone).toBe('idle');
    expect(accreditationView(issuer('PENDING', 1)).detail).toBe('1 de 2 miembros han aprobado');
    expect(accreditationView(issuer('ACTIVE')).tone).toBe('active');
    expect(accreditationView(issuer('SUSPENDED')).tone).toBe('paused');
  });
});
