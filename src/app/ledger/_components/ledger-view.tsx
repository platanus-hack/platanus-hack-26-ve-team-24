'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/check-list';
import { Disclosure } from '@/components/ui/disclosure';
import { Mono } from '@/components/ui/mono';
import type { NetworkState } from '@/lib/ledger/types';
import { ageLabel, formatBlockNumber, issuerStatusView, nameOf } from '../_lib/format';
import { useNetworkState } from '../_lib/use-network-state';
import { BlockStrip } from './block-strip';

function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

const TH = 'border-b-2 border-ink py-3 pr-6 text-left text-small font-bold';
const TD = 'border-t-2 border-rule py-3 pr-6 align-middle';

function LedgerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-4 border-ink pt-4">
      <h2 className="mb-4 font-display text-title font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Head({ state, now }: { state: NetworkState; now: number }) {
  return (
    <section aria-label="Estado del registro" className="grid border-4 border-ink md:grid-cols-12">
      <div className="flex flex-col justify-between gap-6 border-b-4 border-ink bg-marigold p-6 md:col-span-5 md:border-r-4 md:border-b-0">
        <p className="text-title font-bold">Último bloque</p>
        <p className="font-mono text-headline font-bold tnum break-all">
          {formatBlockNumber(state.head.number)}
        </p>
        <p className="text-body">{ageLabel(state.head.time, now)}</p>
      </div>
      <div className="p-6 md:col-span-7">
        <BlockStrip state={state} />
      </div>
    </section>
  );
}

function Members({ state }: { state: NetworkState }) {
  return (
    <LedgerSection title="Consorcio">
      <p className="mb-4 max-w-[45ch] text-body">
        Hacen falta <span className="tnum font-bold">{state.quorum}</span> de{' '}
        <span className="tnum font-bold">{state.members.length}</span> miembros para acreditar a un
        empleador.
      </p>
      <ol className="border-b-2 border-ink">
        {state.members.map((member, index) => (
          <li
            key={member.account}
            className="grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-1 border-t-2 border-rule py-3 sm:grid-cols-[2rem_1fr_auto]"
          >
            <span className="tnum font-bold">{index + 1}</span>
            <span className="font-bold">{member.name}</span>
            <span className="col-start-2 text-small sm:col-start-3">
              <Mono value={member.account} shorten />
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-small text-ink-muted">Miembros ficticios de la demostración.</p>
    </LedgerSection>
  );
}

function Employers({ state }: { state: NetworkState }) {
  return (
    <LedgerSection title="Empleadores acreditados">
      {state.issuers.length === 0 ? (
        <p className="text-body text-ink-muted">Ningún empleador ha solicitado acreditación.</p>
      ) : (
        <ul className="border-b-2 border-ink">
          {state.issuers.map((issuer) => {
            const view = issuerStatusView(issuer);
            return (
              <li
                key={issuer.account}
                data-status={issuer.status}
                className="grid grid-cols-[2.25rem_1fr] items-center gap-x-4 gap-y-1 border-t-2 border-rule py-3"
              >
                <Chip status={view.chip} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-bold">{issuer.name}</span>
                  <span className="tnum text-small font-bold tracking-wide uppercase">
                    {view.label}
                  </span>
                  <span className="basis-full text-small">
                    <Mono value={issuer.account} shorten />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-small text-ink-muted">Empleadores ficticios de la demostración.</p>
    </LedgerSection>
  );
}

function Anchors({ state, now }: { state: NetworkState; now: number }) {
  return (
    <LedgerSection title="Huellas recientes">
      {state.anchors.length === 0 ? (
        <p className="text-body text-ink-muted">Todavía no se ha anclado ninguna huella.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-b-2 border-ink text-body">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Bloque
                </th>
                <th scope="col" className={TH}>
                  Cuándo
                </th>
                <th scope="col" className={TH}>
                  Empleador
                </th>
                <th scope="col" className={TH}>
                  Huella
                </th>
              </tr>
            </thead>
            <tbody>
              {state.anchors.map((anchor) => (
                <tr key={anchor.credentialHash}>
                  <td className={TD}>
                    <code>{formatBlockNumber(anchor.blockNumber)}</code>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-ink-muted`}>
                    {ageLabel(anchor.time, now)}
                  </td>
                  <td className={`${TD} font-bold`}>{nameOf(state, anchor.issuer)}</td>
                  <td className={TD}>
                    <Mono value={anchor.credentialHash} shorten />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-small text-ink-muted">
        Solo huellas. Ningún nombre, ningún dato de la constancia.
      </p>
    </LedgerSection>
  );
}

function StatusLine({ chip, title, children }: { chip: 'CHECKING' | 'UNAVAILABLE'; title: string; children?: ReactNode }) {
  return (
    <div className="mt-12 flex items-start gap-4 border-4 border-ink p-6">
      <Chip status={chip} />
      <div>
        <p className="text-title font-bold">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function LedgerView() {
  const view = useNetworkState();
  const now = useNow();

  if (view.status === 'loading') {
    return (
      <div role="status">
        <StatusLine chip="CHECKING" title="Leyendo el registro…" />
      </div>
    );
  }
  if (view.status === 'unreachable') {
    return (
      <div role="alert">
        <StatusLine chip="UNAVAILABLE" title="El registro no responde en este momento.">
          <p className="mt-2 max-w-[60ch] text-body">
            Tus constancias no se ven afectadas. Esta página vuelve a intentarlo cada pocos
            segundos.
          </p>
        </StatusLine>
      </div>
    );
  }

  const { state } = view;
  return (
    <div className="mt-12 flex flex-col gap-16">
      <Head state={state} now={now} />
      <div className="grid gap-12 lg:grid-cols-2">
        <Members state={state} />
        <Employers state={state} />
      </div>
      <Anchors state={state} now={now} />
      <LedgerSection title="Cómo funciona este registro">
        <p className="max-w-[65ch] text-body">
          Un grupo de miembros, no una sola empresa, decide qué empleadores quedan acreditados. El
          registro vive en una red pública de pruebas que cualquiera puede leer, y el consorcio
          cubre todos los costos: nadie que use Constancia paga nada. Esta página lee el registro a
          través de un único punto de acceso.
        </p>
      </LedgerSection>
      <Disclosure summary="Detalles técnicos">
        <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="font-bold">Red</dt>
          <dd>Sepolia (red pública de pruebas de Ethereum)</dd>
          <dt className="font-bold">Chain ID</dt>
          <dd>
            <code>{state.chainId}</code>
          </dd>
          <dt className="font-bold">Tiempo de bloque</dt>
          <dd className="tnum">{state.blockTimeSec} s</dd>
          <dt className="font-bold">Gas</dt>
          <dd>Lo paga una wallet del consorcio; cada transacción va patrocinada.</dd>
        </dl>
      </Disclosure>
    </div>
  );
}
