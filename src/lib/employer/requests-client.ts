// Browser only: the employer's own pending requests and the two actions on them.
import type { P256Jwk } from '../credential/types';

export interface PendingRequest {
  id: string;
  employeeRef: string;
  kind: 'CURRENT' | 'PAST';
  signJwk: P256Jwk;
  encJwk: P256Jwk;
  createdAt: string;
}

export class SignedOutError extends Error {}

async function call(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { cache: 'no-store', ...init });
  if (response.status === 401) throw new SignedOutError();
  return response;
}

export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  const response = await call('/api/employer/requests');
  if (!response.ok) throw new Error('No se pudieron cargar las solicitudes');
  return ((await response.json()) as { requests: PendingRequest[] }).requests;
}

export async function fetchPendingRequest(id: string): Promise<PendingRequest | null> {
  return (await fetchPendingRequests()).find((request) => request.id === id) ?? null;
}

export async function declineRequest(id: string): Promise<void> {
  const response = await call(`/api/employer/requests/${id}/decline`, { method: 'POST' });
  if (!response.ok) throw new Error('No se pudo rechazar esta solicitud');
}

export async function deliverRequest(id: string, jwe: string): Promise<void> {
  const response = await call(`/api/employer/requests/${id}/deliver`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jwe }),
  });
  if (response.ok || response.status === 409) return; // 409: already delivered counts as done
  throw new Error('No se pudo entregar la constancia');
}
