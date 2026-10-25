'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckList, CheckRow, Chip } from '@/components/ui/check-list';
import { Disclosure } from '@/components/ui/disclosure';
import { Field } from '@/components/ui/field';
import { Mono } from '@/components/ui/mono';
import { listSignerNames, loadSigner } from '@/lib/credential/keystore';
import type { Address } from '@/lib/credential/types';
import { createAccountClient, LedgerWriteError } from '@/lib/ledger/account-client';
import type { TxResult } from '@/lib/ledger/account-client';
import type { IssuerInfo } from '@/lib/ledger/types';
import { formatBlock } from '../_lib/format';
import { useNetworkState } from '../_lib/use-network-state';

const MEMBER_PREFIX = 'member:';

type Action = 'approve' | 'suspend';

function ConsoleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-4 border-ink pt-4">
      <h2 className="mb-4 font-display text-title font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function IssuerRows({
  issuers,
  empty,
  renderAction,
}: {
  issuers: IssuerInfo[];
  empty: string;
  renderAction: (issuer: IssuerInfo) => ReactNode;
}) {
  if (issuers.length === 0) return <p className="text-body text-ink-muted">{empty}</p>;
  return (
    <ul className="border-b-2 border-ink">
      {issuers.map((issuer) => (
        <li
          key={issuer.account}
          className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-rule py-3"
        >
          <span className="font-bold">{issuer.name}</span>
          {renderAction(issuer)}
        </li>
      ))}
    </ul>
  );
}

export function OperatorConsole() {
  const view = useNetworkState();
  const [names, setNames] = useState<string[]>([]);
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      try {
        const all = await listSignerNames();
        const members = all.filter((name) => name.startsWith(MEMBER_PREFIX));
        setNames(members);
        setMember((current) => current || members[0] || '');
      } catch {
        setError('No se pudieron leer las claves de firma de este dispositivo.');
      }
    }
    void loadMembers();
  }, []);

  async function run(action: Action, issuer: Address) {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const signer = await loadSigner(member);
      if (!signer) throw new Error('missing signer');
      const client = await createAccountClient({ signer });
      setResult(await client[action](issuer));
    } catch (caught) {
      setError(
        caught instanceof LedgerWriteError
          ? caught.message
          : 'El registro no aceptó la operación. Revisa el miembro e inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  const issuers = view.status === 'ready' ? view.state.issuers : [];
  const pending = issuers.filter((issuer) => issuer.status === 'PENDING');
  const active = issuers.filter((issuer) => issuer.status === 'ACTIVE');
  const locked = busy || !member;

  return (
    <div className="mt-12 flex flex-col gap-12">
      {names.length === 0 ? (
        <p className="text-body">
          No hay claves de miembros en este dispositivo. Impórtalas desde{' '}
          <Link href="/dev/identity" className="font-bold">
            Identidades de demostración
          </Link>
          .
        </p>
      ) : (
        <Field label="Miembro">
          <select
            name="member"
            value={member}
            onChange={(event) => {
              setMember(event.target.value);
            }}
          >
            {names.map((name) => (
              <option key={name} value={name}>
                {name.slice(MEMBER_PREFIX.length)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {view.status === 'loading' ? (
        <p role="status" className="text-body">
          Leyendo el registro…
        </p>
      ) : null}
      {view.status === 'unreachable' ? (
        <p role="alert" className="text-body font-bold">
          El registro no responde en este momento. Esta página vuelve a intentarlo sola.
        </p>
      ) : null}

      <ConsoleSection title="Esperando aprobación">
        <IssuerRows
          issuers={pending}
          empty="Ningún empleador está esperando."
          renderAction={(issuer) => (
            <>
              <span className="tnum text-small">
                {issuer.approvals}/{issuer.quorum} aprobaciones
              </span>
              <Button
                disabled={locked}
                onClick={() => {
                  void run('approve', issuer.account);
                }}
              >
                Aprobar
              </Button>
            </>
          )}
        />
      </ConsoleSection>

      <ConsoleSection title="Empleadores acreditados">
        <IssuerRows
          issuers={active}
          empty="Ningún empleador está acreditado."
          renderAction={(issuer) => (
            <Button
              variant="secondary"
              disabled={locked}
              onClick={() => {
                void run('suspend', issuer.account);
              }}
            >
              Suspender
            </Button>
          )}
        />
      </ConsoleSection>

      {busy ? (
        <p role="status" className="flex items-center gap-4 text-body">
          <Chip status="CHECKING" />
          Escribiendo en el registro. Un bloque tarda unos 12 segundos…
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="flex items-start gap-4 border-4 border-fail p-4">
          <Chip status="FAILED" />
          <p className="font-bold text-fail">{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-4">
          <CheckList title="Resultado">
            <CheckRow index={1} label="Firmado" status="DONE" />
            <CheckRow
              index={2}
              label="Escrito en el registro"
              status="DONE"
              measured={formatBlock(result.blockNumber)}
            />
            <CheckRow index={3} label="Costo para el miembro" status="DONE" measured="0" />
          </CheckList>
          <Disclosure summary="Detalles técnicos">
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2">
              <dt className="font-bold">Transacción</dt>
              <dd>
                <Mono value={result.txHash} shorten copy />
              </dd>
              <dt className="font-bold">Gas pagado por el consorcio (wei)</dt>
              <dd>
                <code>{BigInt(result.sponsorFeeWei).toString()}</code>
              </dd>
              <dt className="font-bold">Tiempo</dt>
              <dd className="tnum">{result.elapsedMs} ms</dd>
            </dl>
          </Disclosure>
        </div>
      ) : null}
    </div>
  );
}
