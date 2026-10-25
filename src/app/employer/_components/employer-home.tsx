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

const SET_UP = '/employer/onboarding';
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
      setError(caught instanceof Error ? caught.message : 'Could not sign in');
    } finally {
      setBusy(null);
    }
  }

  if (identities.status === 'loading') return <p role="status">Looking for signing keys on this device…</p>;

  if (identities.status === 'error') {
    return (
      <Panel title="This browser could not read its signing keys">
        <p className="mb-6 max-w-[65ch] text-body text-ink-muted">
          That is not the same as having none. Check that this site is allowed to store data, then
          reload.
        </p>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {identities.list.length === 0 ? (
        <Panel title="No organization on this device yet">
          <p className="mb-6 max-w-[65ch] text-body text-ink-muted">
            Your signing key is made and kept on this device. There is nothing to remember and no
            password.
          </p>
          <LinkButton href={SET_UP}>Set up your organization</LinkButton>
        </Panel>
      ) : (
        <Panel title="Sign in with this device">
          <ul className="flex flex-col gap-4">
            {identities.list.map((identity) => (
              <li key={identity.signerName} className="flex flex-wrap items-center gap-4">
                <Button
                  disabled={busy !== null}
                  onClick={() => {
                    void enter(identity);
                  }}
                >
                  {busy === identity.signerName ? 'Signing in…' : `Sign in as ${identity.orgName}`}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-small text-ink-muted">
            <a href={SET_UP_ANOTHER} className="font-bold">
              Set up another organization
            </a>
          </p>
        </Panel>
      )}
      {error && (
        <p role="alert" className="font-bold text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}

interface Step {
  label: string;
  status: RowStatus;
  detail?: string;
  href: string;
}

function readinessSteps(issuer: IssuerInfo | undefined, directoryLoaded: boolean): Step[] {
  const applied = issuer !== undefined && issuer.status !== 'NONE';
  const active = issuer?.status === 'ACTIVE';
  const approvals = issuer ? `${issuer.approvals} of ${issuer.quorum} members approved` : undefined;
  return [
    { label: 'Signing key on this device', status: 'DONE', href: SET_UP },
    { label: 'Organization account', status: 'DONE', href: SET_UP },
    {
      label: 'Applied to the consortium',
      status: applied ? 'DONE' : 'PENDING',
      detail: applied ? undefined : 'Ask the consortium to accredit your organization.',
      href: SET_UP,
    },
    {
      label: 'Accredited',
      status: active ? 'DONE' : issuer?.status === 'SUSPENDED' ? 'FAILED' : applied ? 'CHECKING' : 'PENDING',
      detail: issuer?.status === 'SUSPENDED' ? 'The consortium has paused this organization.' : approvals,
      href: SET_UP,
    },
    {
      label: 'Employee directory loaded',
      status: directoryLoaded ? 'DONE' : 'PENDING',
      detail: 'Employee details stay in this browser and never reach a server.',
      href: '/employer/directory',
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
      <p className="text-body text-ink-muted">
        Signed in as <strong className="text-ink">{name || 'your organization'}</strong>
      </p>
      {unreachable && (
        <p role="status" className="font-bold">
          The ledger is not answering right now. This list refreshes on its own.
        </p>
      )}
      <CheckList title="Ready to issue">
        {steps.map((step, index) => (
          <CheckRow key={step.label} index={index + 1} {...step} href={undefined} />
        ))}
      </CheckList>
      {next && <LinkButton href={next.href}>{next.label === 'Employee directory loaded' ? 'Load your employee directory' : 'Continue setup'}</LinkButton>}
      {!next && <LinkButton href="/employer/requests">Open the request inbox</LinkButton>}
    </div>
  );
}

export function EmployerHome() {
  const view = useMe();
  if (view.status === 'loading') return <p role="status">Checking your session…</p>;
  if (view.status === 'out') return <SignedOut />;
  return <Readiness account={view.me.account} name={view.me.name} />;
}
