'use client';

import { useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Field } from '@/components/ui/field';
import { Mono } from '@/components/ui/mono';
import { Panel } from '@/components/ui/panel';
import { createStoredSigner, loadSigner } from '@/lib/credential/keystore';
import { listIdentities, saveIdentity, type EmployerIdentity } from '@/lib/employer/identity';
import {
  accreditationView,
  orgNameSchema,
  signerNameFor,
} from '@/lib/employer/onboarding';
import { signIn } from '@/lib/employer/session-client';
import { createAccountClient, LedgerWriteError } from '@/lib/ledger/account-client';
import type { TxResult } from '@/lib/ledger/account-client';
import { formatBlock } from '@/lib/ledger/format';
import { fetchNetworkState } from '@/lib/ledger/gateway-client';
import type { IssuerInfo } from '@/lib/ledger/types';

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
      setError('Could not make a signing key on this device. Check your browser settings and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Name your organization">
      <form
        className="flex max-w-xl flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <Field label="Organization name" error={error}>
          <input
            name="orgName"
            autoComplete="organization"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create signing key'}
        </Button>
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
        setError('The ledger has your application, but this device could not start a session. Sign in again from this page.');
      }
    } catch (caught) {
      setError(
        caught instanceof LedgerWriteError
          ? caught.message
          : 'The ledger did not accept the application. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  const applied = issuer !== undefined && issuer.status !== 'NONE';

  return (
    <Panel title="Ask the consortium to accredit you">
      {!applied && (
        <div className="flex flex-col gap-6">
          <p className="max-w-[65ch] text-body text-ink-muted">
            The consortium is the group of members who decide which organizations may issue
            certificates.
          </p>
          <div>
            <Button disabled={busy} onClick={() => void apply()}>
              {busy ? 'Applying…' : 'Apply for accreditation'}
            </Button>
          </div>
        </div>
      )}
      {result && (
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
      )}
      {applied && (
        <div role="status" className="mt-6 flex flex-col gap-4" data-tone={view.tone}>
          <p className="font-display text-title font-extrabold font-stretch-expanded">{view.headline}</p>
          <p className="max-w-[65ch] text-body text-ink-muted">
            {view.detail}
          </p>
          {view.tone === 'active' && <LinkButton href="/employer/requests">Open the request inbox</LinkButton>}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 font-bold text-red-text">
          {error}
        </p>
      )}
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
        // the next tick tries again; the status simply stays as it was
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

  if (identity === undefined) return <p role="status">Looking for signing keys on this device…</p>;

  return (
    <div className="flex flex-col gap-8">
      {identity === null ? (
        <NameStep onCreated={setIdentity} />
      ) : (
        <>
          <Panel title={identity.orgName} tone="quiet">
            <p className="text-small text-ink-muted">Organization account</p>
            <Mono value={identity.account} shorten copy />
          </Panel>
          <ApplyStep identity={identity} issuer={issuer} />
        </>
      )}
      <p className="max-w-[65ch] text-small text-ink-muted">
        This signing key lives only on this device and there is no backup yet. If you clear this
        browser, ask the consortium to accredit a new device.
      </p>
    </div>
  );
}
