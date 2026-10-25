'use client';

import { useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Mono } from '@/components/ui/mono';
import { Panel } from '@/components/ui/panel';
import { loadSigner } from '@/lib/credential/keystore';
import { listIdentities } from '@/lib/employer/identity';
import { listIssued, type IssuedLogEntry } from '@/lib/employer/issued-log';
import { certificateStatus, formatDate, type CertificateStatus } from '@/lib/employer/issued-status';
import { useMe } from '@/lib/employer/use-me';
import { createAccountClient, LedgerWriteError, type TxResult } from '@/lib/ledger/account-client';
import { formatBlock } from '@/lib/ledger/format';
import { lookupLedger } from '@/lib/ledger/gateway-client';

type Status = CertificateStatus | { kind: 'LOADING' } | { kind: 'UNKNOWN' };

function statusLabel(status: Status): string {
  switch (status.kind) {
    case 'ACTIVE':
      return 'Active';
    case 'REVOKED':
      return `Revoked ${formatDate(status.revokedAt)}`;
    case 'NOT_ON_LEDGER':
      return 'Not on the ledger';
    case 'UNKNOWN':
      return 'Ledger not answering';
    case 'LOADING':
      return 'Checking…';
    default:
      return 'Checking…';
  }
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
      const tx = await (await createAccountClient({ signer, account })).revoke(entry.credentialHash);
      setResult(tx);
      setStatus({ kind: 'REVOKED', revokedAt: Math.floor(Date.now() / 1000) });
      setConfirming(false);
    } catch (caught) {
      setError(
        caught instanceof LedgerWriteError
          ? caught.message
          : 'The ledger did not accept that. Try again in a moment.',
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
            <code>{entry.employeeRef}</code> · {entry.kind}
          </p>
          <p className="text-small text-ink-muted">
            Issued {entry.issuedAt.slice(0, 10)} · <Mono value={entry.credentialHash} shorten />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p role="status" className="text-small font-bold uppercase tracking-wide">
            {statusLabel(status)}
          </p>
          {status.kind === 'ACTIVE' && !confirming && (
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(true);
              }}
            >
              Revoke
            </Button>
          )}
        </div>
      </div>
      {confirming && (
        <div className="mt-4">
          <Panel title="Revoke this certificate?">
            <p className="mb-4 max-w-[65ch] text-body">
              Everyone holding this certificate will see it fail the ledger check. This cannot be undone.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => void revoke()}>
                {busy ? 'Revoking…' : 'Revoke certificate'}
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                Keep it
              </Button>
            </div>
          </Panel>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 font-bold text-red-text">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4" aria-live="polite">
          <CheckList>
            <CheckRow index={1} label="Signed" status="DONE" measured="ES256 · this device" />
            <CheckRow
              index={2}
              label="Written to the ledger"
              status="DONE"
              measured={`${formatBlock(result.blockNumber)} · ${result.elapsedMs} ms`}
            />
            <CheckRow index={3} label="Fee" status="DONE" measured={`${result.feeWei} · paid by the consortium`} />
          </CheckList>
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

  if (me.status === 'loading' || entries === null) return <p role="status">Loading…</p>;
  if (me.status === 'out') {
    return (
      <Panel title="Sign in first">
        <LinkButton href="/employer">Sign in with this device</LinkButton>
      </Panel>
    );
  }
  if (entries.length === 0) {
    return <p className="text-body text-ink-muted">Nothing issued from this device yet.</p>;
  }
  return (
    <ul className="border-b-2 border-ink">
      {entries.map((entry) => (
        <IssuedRow key={entry.credentialHash} entry={entry} account={me.me.account} />
      ))}
    </ul>
  );
}
