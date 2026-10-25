import { z } from 'zod';
import type { EcdhJwk, P256Jwk } from '@/lib/credential/types';
import type { CreateRequestBody } from './requests-client';
import type { VaultStore } from './store';
import type { VaultRequest } from './types';

export const requestInputSchema = z.object({
  employer: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Elige un empleador'),
  employeeRef: z
    .string()
    .trim()
    .min(1, 'Escribe tu número de empleado')
    .max(40, 'Máximo 40 caracteres'),
  kind: z.enum(['CURRENT', 'PAST']),
});
export type RequestInput = z.input<typeof requestInputSchema>;

export interface RequestFlowDeps {
  store: VaultStore;
  createSigner(name: string): Promise<{ jwk: P256Jwk }>;
  generateEncKey(): Promise<{ privateKey: CryptoKey; jwk: EcdhJwk }>;
  postRequest(body: CreateRequestBody): Promise<string>;
  now?: () => number;
}

/** Fresh sign key and fresh ECDH key per request; only the public halves leave the device. */
export async function startRequest(
  deps: RequestFlowDeps,
  input: RequestInput,
): Promise<VaultRequest> {
  const parsed = requestInputSchema.parse(input);
  const employer = parsed.employer.toLowerCase();
  const keyName = `cert:${crypto.randomUUID()}`;
  const [signer, enc] = await Promise.all([deps.createSigner(keyName), deps.generateEncKey()]);
  const id = await deps.postRequest({
    employer,
    employeeRef: parsed.employeeRef,
    kind: parsed.kind,
    signJwk: signer.jwk,
    encJwk: enc.jwk,
  });
  const request: VaultRequest = {
    id,
    employer,
    employeeRef: parsed.employeeRef,
    kind: parsed.kind,
    keyName,
    createdAt: (deps.now ?? Date.now)(),
    status: 'PENDING',
    encPrivateKey: enc.privateKey,
  };
  await deps.store.putRequest(request);
  return request;
}
