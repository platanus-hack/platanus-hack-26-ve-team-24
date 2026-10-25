'use client';

import { useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow, type RowStatus } from '@/components/ui/check-list';
import { Panel } from '@/components/ui/panel';
import { listDirectory } from '@/lib/employer/directory';
import { listIdentities, type EmployerIdentity } from '@/lib/employer/identity';
import { signIn } from '@/lib/employer/session-client';
import { useMe } from '@/lib/employer/use-me';
import { fetchNetworkState } from '@/lib/ledger/gateway-client';
import type { IssuerInfo } from '@/lib/ledger/types';
import { ErrorText } from '@/components/ui/error-text';

const SET_UP = '/employer/onboarding';
const DIRECTORY = '/employer/directory';
const SET_UP_ANOTHER = '/employer/onboarding?create=1';

type Identities =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; list: EmployerIdentity[] };

function SignedOut() {
  const [identities, setIdentities] = useState<Identities>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const list = await listIdentities();
        if (active) setIdentities({ status: 'ready', list });
      } catch {
        if (active) setIdentities({ status: 'error' });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function enter(identity: EmployerIdentity) {
    setBusy(identity.signerName);
    setError(null);
    try {
      await signIn(identity);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(null);
    }
  }

  if (identities.status === 'loading') return <p role="status">Buscando claves de firma en este dispositivo…</p>;

  if (identities.status === 'error') {
    return (
      <Panel title="Este navegador no pudo leer sus claves de firma">
        <p className="mb-6 max-w-[65ch] text-body text-ink-muted">
          No es lo mismo que no tener ninguna. Revisa que este sitio pueda guardar datos y recarga
          la página.
        </p>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Intentar de nuevo
        </Button>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {identities.list.length === 0 ? (
        <Panel title="Aún no hay una organización en este dispositivo">
          <p className="mb-6 max-w-[65ch] text-body text-ink-muted">
            Tu clave de firma se crea y se guarda en este dispositivo. No hay nada que recordar ni
            contraseña.
          </p>
          <LinkButton href={SET_UP}>Configurar tu organización</LinkButton>
        </Panel>
      ) : (
        <Panel title="Inicia sesión con este dispositivo">
          <ul className="flex flex-col gap-4">
            {identities.list.map((identity) => (
              <li key={identity.signerName} className="flex flex-wrap items-center gap-4">
                <Button
                  disabled={busy !== null}
                  onClick={() => {
                    void enter(identity);
                  }}
                >
                  {busy === identity.signerName ? 'Iniciando sesión…' : `Entrar como ${identity.orgName}`}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <a href={SET_UP_ANOTHER} className="inline-flex min-h-12 items-center font-bold">
              Configurar otra organización
            </a>
          </p>
        </Panel>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

interface Step {
  label: string;
  status: RowStatus;
  detail?: string;
  href: string;
  action: string;
}

function accreditedStatus(issuer: IssuerInfo | undefined, applied: boolean): RowStatus {
  if (issuer?.status === 'ACTIVE') return 'DONE';
  if (issuer?.status === 'SUSPENDED') return 'FAILED';
  return applied ? 'CHECKING' : 'PENDING';
}

function readinessSteps(issuer: IssuerInfo | undefined, directoryLoaded: boolean): Step[] {
  const applied = issuer !== undefined && issuer.status !== 'NONE';
  const approvals = issuer ? `${issuer.approvals} de ${issuer.quorum} miembros aprobaron` : undefined;
  return [
    { label: 'Clave de firma en este dispositivo', status: 'DONE', href: SET_UP, action: 'Continuar la configuración' },
    { label: 'Cuenta de la organización', status: 'DONE', href: SET_UP, action: 'Continuar la configuración' },
    {
      label: 'Acreditación solicitada al consorcio',
      status: applied ? 'DONE' : 'PENDING',
      detail: applied ? undefined : 'Pide al consorcio que acredite a tu organización.',
      href: SET_UP,
      action: 'Solicitar la acreditación',
    },
    {
      label: 'Acreditada',
      status: accreditedStatus(issuer, applied),
      detail: issuer?.status === 'SUSPENDED' ? 'El consorcio puso en pausa a esta organización.' : approvals,
      href: SET_UP,
      action: 'Ver la acreditación',
    },
    {
      label: 'Directorio de empleados cargado',
      status: directoryLoaded ? 'DONE' : 'PENDING',
      detail: 'Los datos de los empleados se quedan en este navegador y nunca llegan a un servidor.',
      href: DIRECTORY,
      action: 'Cargar tu directorio de empleados',
    },
  ];
}

function Readiness({ account, name }: { account: string; name: string }) {
  const [issuer, setIssuer] = useState<IssuerInfo | undefined>();
  const [unreachable, setUnreachable] = useState(false);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const entries = await listDirectory();
        if (active) setDirectoryLoaded(entries.length > 0);
      } catch {
        // The row simply stays pending; the directory page reports its own trouble.
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const state = await fetchNetworkState();
        if (!active) return;
        setIssuer(state.issuers.find((item) => item.account === account));
        setUnreachable(false);
      } catch {
        if (active) setUnreachable(true);
      }
    }
    void load();
    const timer = setInterval(() => {
      void load();
    }, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [account]);

  const steps = readinessSteps(issuer, directoryLoaded);
  const next = steps.find((step) => step.status !== 'DONE');

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body">
        Sesión iniciada como <strong>{name || 'tu organización'}</strong>
      </p>
      {unreachable && (
        <p role="status" className="font-bold">
          El registro no responde en este momento. Esta lista se actualiza sola.
        </p>
      )}
      <CheckList title="Lista para emitir">
        {steps.map((step, index) => (
          <CheckRow key={step.label} index={index + 1} label={step.label} status={step.status} detail={step.detail} />
        ))}
      </CheckList>
      <div>
        {next ? (
          <LinkButton href={next.href}>{next.action}</LinkButton>
        ) : (
          <LinkButton href="/employer/requests">Abrir las solicitudes</LinkButton>
        )}
      </div>
    </div>
  );
}

export function EmployerHome() {
  const view = useMe();
  if (view.status === 'loading') return <p role="status">Comprobando tu sesión…</p>;
  if (view.status === 'out') return <SignedOut />;
  return <Readiness account={view.me.account} name={view.me.name} />;
}
