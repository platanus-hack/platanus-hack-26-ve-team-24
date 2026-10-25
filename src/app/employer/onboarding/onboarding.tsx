'use client';

import { useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Mono } from '@/components/ui/mono';
import { Panel } from '@/components/ui/panel';
import { createStoredSigner, loadSigner } from '@/lib/credential/keystore';
import { listIdentities, saveIdentity, type EmployerIdentity } from '@/lib/employer/identity';
import { accreditationView, orgNameSchema, signerNameFor } from '@/lib/employer/onboarding';
import { signIn } from '@/lib/employer/session-client';
import { createAccountClient, LedgerWriteError } from '@/lib/ledger/account-client';
import type { TxResult } from '@/lib/ledger/account-client';
import { fetchNetworkState } from '@/lib/ledger/gateway-client';
import type { IssuerInfo } from '@/lib/ledger/types';
import { ErrorText } from '@/components/ui/error-text';
import { LedgerWriteReceipt } from '../_components/ledger-write-receipt';
import { OnboardingSteps, stepStates } from './onboarding-steps';

const POLL_MS = 3000;

function NameStep({ onCreated }: { onCreated: (identity: EmployerIdentity) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function create() {
    const parsed = orgNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const signerName = signerNameFor(parsed.data);
      const signer = await createStoredSigner(signerName);
      const client = await createAccountClient({ signer });
      const identity = { signerName, account: client.address, orgName: parsed.data };
      await saveIdentity(identity);
      onCreated(identity);
    } catch {
      setError(
        'No se pudo crear una clave de firma en este dispositivo. Revisa la configuración del navegador e inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Nombra tu organización">
      <form
        className="flex max-w-xl flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <Field label="Nombre de la organización" error={error}>
          <input
            name="orgName"
            autoComplete="organization"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>
        <div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear clave de firma'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ApplyStep({ identity, issuer }: { identity: EmployerIdentity; issuer?: IssuerInfo }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const view = accreditationView(issuer);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const signer = await loadSigner(identity.signerName);
      if (!signer) throw new Error('missing signer');
      const client = await createAccountClient({ signer });
      setResult(await client.applyForAccreditation(identity.orgName));
      try {
        await signIn(identity);
      } catch {
        setError(
          'El registro ya tiene tu solicitud, pero este dispositivo no pudo iniciar sesión. Vuelve a entrar desde esta página.',
        );
      }
    } catch (caught) {
      setError(
        caught instanceof LedgerWriteError
          ? caught.message
          : 'El registro no aceptó la solicitud. Inténtalo de nuevo en un momento.',
      );
    } finally {
      setBusy(false);
    }
  }

  const applied = issuer !== undefined && issuer.status !== 'NONE';

  return (
    <Panel title="Pide al consorcio que te acredite">
      <div className="flex flex-col gap-6">
        {!applied && (
          <>
            <p className="max-w-[65ch] text-body">
              El consorcio es el grupo de miembros que decide qué organizaciones pueden emitir
              constancias.
            </p>
            <div>
              <Button disabled={busy} onClick={() => void apply()}>
                {busy ? 'Enviando…' : 'Solicitar la acreditación'}
              </Button>
            </div>
          </>
        )}
        {result && <LedgerWriteReceipt result={result} />}
        {applied && (
          <div role="status" className="flex flex-col gap-4" data-tone={view.tone}>
            <p className="font-display text-title font-extrabold">{view.headline}</p>
            <p className="max-w-[65ch] text-body">{view.detail}</p>
            {view.tone === 'active' && (
              <div>
                <LinkButton href="/employer">Emitir una constancia</LinkButton>
              </div>
            )}
          </div>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Panel>
  );
}

function useIssuer(account: string | undefined): IssuerInfo | undefined {
  const [issuer, setIssuer] = useState<IssuerInfo | undefined>();
  useEffect(() => {
    if (!account) return undefined;
    let active = true;
    async function poll() {
      try {
        const state = await fetchNetworkState();
        if (active) setIssuer(state.issuers.find((item) => item.account === account));
      } catch {
        // el siguiente ciclo reintenta; el estado se queda como estaba
      }
    }
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [account]);
  return issuer;
}

/** Read from the URL on the client: the page itself stays static and prerenderable. */
const wantsANewOrganization = () =>
  new URLSearchParams(window.location.search).get('create') === '1';

export function Onboarding() {
  const [identity, setIdentity] = useState<EmployerIdentity | null | undefined>(undefined);
  const issuer = useIssuer(identity?.account);

  useEffect(() => {
    const createNew = wantsANewOrganization();
    let active = true;
    async function load() {
      try {
        const all = await listIdentities();
        if (active) setIdentity(createNew ? null : (all[0] ?? null));
      } catch {
        if (active) setIdentity(null);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (identity === undefined)
    return <p role="status">Buscando claves de firma en este dispositivo…</p>;

  return (
    <div className="flex flex-col gap-10">
      <OnboardingSteps states={stepStates(identity !== null, issuer)} />
      {identity === null ? (
        <NameStep onCreated={setIdentity} />
      ) : (
        <>
          <Panel title={identity.orgName} tone="quiet">
            <p className="text-small text-ink-muted">Cuenta de la organización</p>
            <Mono value={identity.account} shorten copy />
          </Panel>
          <ApplyStep identity={identity} issuer={issuer} />
        </>
      )}
      <p className="max-w-[65ch] text-small text-ink-muted">
        Esta clave de firma vive solo en este dispositivo y todavía no tiene respaldo. Si borras los
        datos de este navegador, pide al consorcio que acredite un dispositivo nuevo.
      </p>
    </div>
  );
}
