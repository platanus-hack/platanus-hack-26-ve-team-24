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
  it('names the device key after the organization', () => {
    expect(signerNameFor('Orinoco Logística (demo)')).toBe('employer:orinoco-logistica-demo');
    expect(signerNameFor('!!!')).toBe('employer:organization');
  });

  it('validates the organization name length', () => {
    expect(orgNameSchema.safeParse('A').success).toBe(false);
    expect(orgNameSchema.safeParse('  Demo Org  ').data).toBe('Demo Org');
    expect(orgNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
  });

  it('describes each accreditation state', () => {
    expect(accreditationView(undefined).tone).toBe('idle');
    expect(accreditationView(issuer('PENDING', 1)).detail).toBe('1 de 2 miembros han aprobado');
    expect(accreditationView(issuer('ACTIVE')).tone).toBe('active');
    expect(accreditationView(issuer('SUSPENDED')).tone).toBe('paused');
  });
});
