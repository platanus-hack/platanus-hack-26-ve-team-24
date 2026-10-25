// Browser only: signs in by proving the device key, no password.
import { loadSigner } from '../credential/keystore';
import { toB64u, utf8 } from '../credential/jws';
import type { Address } from '../credential/types';
import type { IssuerStatus } from '../ledger/types';
import type { EmployerIdentity } from './identity';

export interface EmployerMe {
  account: Address;
  name: string;
  status: IssuerStatus;
}

export const SESSION_CHANGED = 'employer-session-changed';
const notify = () => window.dispatchEvent(new Event(SESSION_CHANGED));

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const { message } = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(message ?? 'No se pudo iniciar sesión');
  }
  return (await response.json()) as T;
}

export async function signIn(identity: EmployerIdentity): Promise<void> {
  const signer = await loadSigner(identity.signerName);
  if (!signer) throw new Error('La clave de firma de esta organización no está en este dispositivo');
  const { challenge } = await post<{ challenge: string }>('/api/auth/challenge', {
    account: identity.account,
    keyId: signer.keyId,
  });
  const signature = toB64u(await signer.sign(utf8(challenge)));
  await post('/api/auth/session', { challenge, signature });
  notify();
}

export async function fetchMe(): Promise<EmployerMe | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  return response.ok ? ((await response.json()) as EmployerMe) : null;
}

export async function signOut(): Promise<void> {
  await post('/api/auth/logout', {});
  notify();
}
