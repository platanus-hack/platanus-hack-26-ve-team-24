'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip, type RowStatus } from '@/components/ui/check-list';
import { Mono } from '@/components/ui/mono';
import { Panel } from '@/components/ui/panel';
import { loadSigner } from '@/lib/credential/keystore';
import { listIdentities } from '@/lib/employer/identity';
import { listIssued, type IssuedLogEntry } from '@/lib/employer/issued-log';
import {
  certificateStatus,
  formatDate,
  type CertificateStatus,
} from '@/lib/employer/issued-status';
import { useMe } from '@/lib/employer/use-me';
import { createAccountClient, LedgerWriteError, type TxResult } from '@/lib/ledger/account-client';
import { lookupLedger } from '@/lib/ledger/gateway-client';
import { ErrorText } from '@/components/ui/error-text';
import { LedgerWriteReceipt } from '../_components/ledger-write-receipt';
import { SignInFirst } from '../_components/sign-in-first';

type Status = CertificateStatus | { kind: 'LOADING' } | { kind: 'UNKNOWN' };

// cada estado: palabra, marca y color
function statusView(status: Status): { chip: RowStatus; word: string; tone: string } {
  switch (status.kind) {
    case 'ACTIVE':
      return { chip: 'VERIFIED', word: 'Vigente', tone: 'text-ok' };
    case 'REVOKED':
      return {
        chip: 'FAILED',
        word: `Revocada el ${formatDate(status.revokedAt)}`,
        tone: 'text-fail',
      };
    case 'NOT_ON_LEDGER':
      return { chip: 'FAILED', word: 'No está en el registro', tone: 'text-fail' };
    case 'UNKNOWN':
      return { chip: 'UNAVAILABLE', word: 'El registro no responde', tone: 'text-ink' };
    case 'LOADING':
      return { chip: 'CHECKING', word: 'Comprobando…', tone: 'text-ink' };
    default:
      return { chip: 'CHECKING', word: 'Comprobando…', tone: 'text-ink' };
  }
}

function StatusBadge({ status }: { status: Status }) {
  const view = statusView(status);
  return (
    <p
      role="status"
      className={`flex items-center gap-3 text-small font-bold uppercase tracking-wide ${view.tone}`}
    >
      <Chip status={view.chip} />
      {view.word}
    </p>
  );
}

function IssuedRow({ entry, account }: { entry: IssuedLogEntry; account: `0x${string}` }) {
  const [status, setStatus] = useState<Status>({ kind: 'LOADING' });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await lookupLedger({
          issuer: account,
          keyId: entry.keyId,
          credentialHash: entry.credentialHash,
        });
        if (active) setStatus(certificateStatus(response));
      } catch {
        if (active) setStatus({ kind: 'UNKNOWN' });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [account, entry.keyId, entry.credentialHash]);

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const identity = (await listIdentities()).find((item) => item.account === account);
      const signer = identity ? await loadSigner(identity.signerName) : null;
      if (!signer) throw new Error('missing signer');
      const tx = await (
        await createAccountClient({ signer, account })
      ).revoke(entry.credentialHash);
      setResult(tx);
      setStatus({ kind: 'REVOKED', revokedAt: Math.floor(Date.now() / 1000) });
      setConfirming(false);
    } catch (caught) {
      setError(
        caught instanceof LedgerWriteError
          ? caught.message
          : 'El registro no aceptó la revocación. Inténtalo de nuevo en un momento.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-t-2 border-ink py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-title font-bold">
            {entry.subject} · {entry.jobTitle}
          </p>
          <p className="text-small text-ink-muted">
            Emitida el {entry.issuedAt.slice(0, 10)} · <Mono value={entry.credentialHash} shorten />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge status={status} />
          {status.kind === 'ACTIVE' && !confirming && (
            <Button
              variant="secondary"
              aria-label={`Revocar la constancia de ${entry.subject}`}
              onClick={() => {
                setConfirming(true);
              }}
            >
              Revocar
            </Button>
          )}
        </div>
      </div>
      {confirming && (
        <div className="mt-4">
          <Panel title="¿Revocar esta constancia?">
            <p className="mb-4 max-w-[65ch] text-body">
              Quien tenga esta constancia verá que falla la comprobación del registro. No se puede
              deshacer.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => void revoke()}>
                {busy ? 'Revocando…' : 'Revocar la constancia'}
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Conservarla
              </Button>
            </div>
          </Panel>
        </div>
      )}
      {error && <ErrorText className="mt-4">{error}</ErrorText>}
      {result && (
        <div className="mt-4" aria-live="polite">
          <LedgerWriteReceipt result={result} />
        </div>
      )}
    </li>
  );
}

export function IssuedList() {
  const me = useMe();
  const [entries, setEntries] = useState<IssuedLogEntry[] | null>(null);

  useEffect(() => {
    void listIssued()
      .then(setEntries)
      .catch(() => {
        setEntries([]);
      });
  }, []);

  if (me.status === 'loading' || entries === null) return <p role="status">Cargando…</p>;
  if (me.status === 'out') return <SignInFirst />;
  if (entries.length === 0) {
    return <p className="text-body">Aún no has emitido constancias desde este dispositivo.</p>;
  }
  return (
    <ul className="border-b-2 border-ink">
      {entries.map((entry) => (
        <IssuedRow key={entry.credentialHash} entry={entry} account={me.me.account} />
      ))}
    </ul>
  );
}
