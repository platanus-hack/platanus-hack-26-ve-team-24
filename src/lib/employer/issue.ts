// The issuing orchestration. Order is the guarantee: sign, anchor, then package; the PDF is never handed
// over unless its hash is already on the ledger. Every dependency is injected so this runs in tests.
import type { IssuedCredential } from '../credential/sdjwt';
import type { EmploymentRecord, P256Jwk, P256PrivateJwk } from '../credential/types';
import type { TxResult } from '../ledger/account-types';
import { LedgerWriteError } from '../ledger/account-types';
import { formatBlock, shortHash } from '../ledger/format';
import type { IssuedLogEntry } from './issued-log';

export type IssueStepId = 'SIGNED' | 'ANCHORED' | 'PACKAGED' | 'RECORDED';
export type StepStatus = 'CHECKING' | 'DONE' | 'FAILED';

export interface StepEvent {
  step: IssueStepId;
  status: StepStatus;
  measured?: string;
  detail?: string;
}

export interface IssueDeps {
  newHolderKey(): Promise<P256PrivateJwk>;
  sign(record: EmploymentRecord, holderJwk: P256Jwk): Promise<IssuedCredential>;
  anchor(credentialHash: `0x${string}`): Promise<TxResult>;
  /** Builds the PDF: visual layer plus the token. */
  packageCredential(credential: IssuedCredential, holderKey: P256PrivateJwk): Promise<Uint8Array>;
  record(entry: IssuedLogEntry): Promise<void>;
}

/** What already happened, kept between attempts so "Retry from here" never redoes finished work. */
export interface IssueProgress {
  holderKey?: P256PrivateJwk;
  credential?: IssuedCredential;
  anchor?: { blockNumber: number | null };
  pdf?: Uint8Array;
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
  args: { record: EmploymentRecord },
  deps: IssueDeps,
  progress: IssueProgress,
  onProgress: (event: StepEvent) => void,
): Promise<IssueProgress> {
  const { record } = args;
  const emit = (
    step: IssueStepId,
    status: StepStatus,
    extra?: Pick<StepEvent, 'measured' | 'detail'>,
  ) => {
    onProgress({ step, status, ...extra });
  };

  try {
    if (!progress.credential) {
      emit('SIGNED', 'CHECKING');
      progress.credential = await attempt(
        'SIGNED',
        'No se pudo firmar la constancia en este dispositivo',
        async () => {
          progress.holderKey ??= await deps.newHolderKey();
          return deps.sign(record, progress.holderKey);
        },
      );
    }
    const { credential } = progress;
    emit('SIGNED', 'DONE', {
      measured: `ES256 · clave ${shortHash(credential.keyId)} · ${credential.sdJwt.length.toLocaleString('es-VE')} caracteres`,
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
      measured:
        progress.anchor.blockNumber === null
          ? 'ya estaba en el registro'
          : formatBlock(progress.anchor.blockNumber),
    });

    if (!progress.pdf) {
      emit('PACKAGED', 'CHECKING');
      const { holderKey } = progress;
      progress.pdf = await attempt('PACKAGED', 'No se pudo armar el PDF. No se perdió nada.', () =>
        deps.packageCredential(credential, holderKey!),
      );
    }
    emit('PACKAGED', 'DONE', {
      measured: `PDF · ${kb(progress.pdf.length)} · token firmado adentro`,
    });

    if (!progress.finished) {
      emit('RECORDED', 'CHECKING');
      await attempt(
        'RECORDED',
        'No se pudo actualizar la lista de emitidas en este dispositivo',
        () =>
          deps.record({
            credentialHash: credential.credentialHash,
            keyId: credential.keyId,
            subject: `${record.givenName} ${record.familyName}`,
            jobTitle: record.jobTitle,
            issuedAt: new Date().toISOString(),
          }),
      );
      progress.finished = true;
    }
    emit('RECORDED', 'DONE', { measured: 'guardada en la lista de emitidas de este dispositivo' });
    return progress;
  } catch (error) {
    if (error instanceof IssueFailure) emit(error.step, 'FAILED', { detail: error.message });
    throw error;
  }
}
