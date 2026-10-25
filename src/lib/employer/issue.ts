// The issuing orchestration. Order is the guarantee: sign, anchor, then deliver; a certificate is never
// delivered unless its hash is already on the ledger. Every dependency is injected so this runs in tests.
import type { IssuedCredential } from '../credential/sdjwt';
import type { EcdhJwk, EmploymentRecord, P256Jwk } from '../credential/types';
import type { TxResult } from '../ledger/account-types';
import { LedgerWriteError } from '../ledger/account-types';
import { formatBlock, shortHash } from '../ledger/format';
import type { IssuedLogEntry } from './issued-log';
import { REQUEST_KIND_LABELS } from './record-fields';

export type IssueStepId = 'OPENED' | 'SIGNED' | 'ANCHORED' | 'DELIVERED' | 'DISCARDED';
export type StepStatus = 'CHECKING' | 'DONE' | 'FAILED';

export interface StepEvent {
  step: IssueStepId;
  status: StepStatus;
  measured?: string;
  detail?: string;
}

export interface IssueRequest {
  id: string;
  employeeRef: string;
  kind: 'CURRENT' | 'PAST';
  signJwk: P256Jwk;
  encJwk: EcdhJwk;
}

export interface IssueDeps {
  sign(record: EmploymentRecord, holderJwk: P256Jwk): Promise<IssuedCredential>;
  anchor(credentialHash: `0x${string}`): Promise<TxResult>;
  encrypt(plaintext: string, encJwk: EcdhJwk): Promise<string>;
  deliver(requestId: string, jwe: string): Promise<void>;
  record(entry: IssuedLogEntry): Promise<void>;
  discard(): void;
}

/** What already happened, kept between attempts so "Retry from here" never redoes finished work. */
export interface IssueProgress {
  credential?: IssuedCredential;
  anchor?: { blockNumber: number | null };
  jwe?: string;
  delivered?: boolean;
  finished?: boolean;
}

export class IssueFailure extends Error {
  constructor(
    readonly step: IssueStepId,
    message: string,
  ) {
    super(message);
  }
}

const byteLength = (text: string) => new TextEncoder().encode(text).length;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const ALREADY_ANCHORED = /already.?exists/i;

async function attempt<T>(step: IssueStepId, fallback: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const reason = error instanceof LedgerWriteError ? error.message : fallback;
    throw new IssueFailure(step, reason);
  }
}

export async function runIssue(
  args: { request: IssueRequest; record: EmploymentRecord },
  deps: IssueDeps,
  progress: IssueProgress,
  onProgress: (event: StepEvent) => void,
): Promise<IssueProgress> {
  const { request, record } = args;
  const emit = (step: IssueStepId, status: StepStatus, extra?: Pick<StepEvent, 'measured' | 'detail'>) => {
    onProgress({ step, status, ...extra });
  };
  const fail = (error: unknown): never => {
    if (error instanceof IssueFailure) emit(error.step, 'FAILED', { detail: error.message });
    throw error;
  };

  try {
    emit('OPENED', 'DONE', { measured: `${request.employeeRef} · ${REQUEST_KIND_LABELS[request.kind]}` });

    if (!progress.credential) {
      emit('SIGNED', 'CHECKING');
      progress.credential = await attempt('SIGNED', 'No se pudo firmar la constancia en este dispositivo', () =>
        deps.sign(record, request.signJwk),
      );
    }
    const { credential } = progress;
    emit('SIGNED', 'DONE', {
      measured: `ES256 · clave ${shortHash(credential.keyId)} · ${kb(byteLength(credential.sdJwt))}`,
    });

    if (!progress.anchor) {
      emit('ANCHORED', 'CHECKING');
      progress.anchor = await attempt('ANCHORED', 'El registro no aceptó la huella', async () => {
        try {
          return { blockNumber: (await deps.anchor(credential.credentialHash)).blockNumber };
        } catch (error) {
          // A hash that is already on the ledger from our own earlier attempt counts as success.
          if (error instanceof LedgerWriteError && ALREADY_ANCHORED.test(error.technical)) {
            return { blockNumber: null };
          }
          throw error;
        }
      });
    }
    emit('ANCHORED', 'DONE', {
      measured: progress.anchor.blockNumber === null ? 'ya estaba en el registro' : formatBlock(progress.anchor.blockNumber),
    });

    if (!progress.delivered) {
      emit('DELIVERED', 'CHECKING');
      await attempt('DELIVERED', 'No se pudo entregar la constancia. No se perdió nada.', async () => {
        progress.jwe ??= await deps.encrypt(credential.sdJwt, request.encJwk);
        await deps.deliver(request.id, progress.jwe);
      });
      progress.delivered = true;
    }
    emit('DELIVERED', 'DONE', {
      measured: `${kb(byteLength(progress.jwe ?? ''))} · solo el titular puede leerla`,
    });

    if (!progress.finished) {
      emit('DISCARDED', 'CHECKING');
      await attempt('DISCARDED', 'No se pudo actualizar la lista de emitidas en este dispositivo', () =>
        deps.record({
          credentialHash: credential.credentialHash,
          keyId: credential.keyId,
          employeeRef: request.employeeRef,
          issuedAt: new Date().toISOString(),
          kind: request.kind,
        }),
      );
      deps.discard();
      progress.finished = true;
    }
    emit('DISCARDED', 'DONE', { measured: 'formulario vacío · la huella queda en este dispositivo' });
    return progress;
  } catch (error) {
    return fail(error);
  }
}
