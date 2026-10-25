'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { listDirectory, type DirectoryEntry } from '@/lib/employer/directory';
import {
  declineRequest,
  fetchPendingRequests,
  SignedOutError,
  type PendingRequest,
} from '@/lib/employer/requests-client';
import { formatAge } from '@/lib/ledger/format';

const POLL_MS = 3000;

type Inbox =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'ready'; requests: PendingRequest[] };

function RequestCard({
  request,
  person,
  now,
  onDecline,
}: {
  request: PendingRequest;
  person: DirectoryEntry | undefined;
  now: number;
  onDecline: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decline() {
    setBusy(true);
    setError(null);
    try {
      await onDecline();
    } catch {
      setError('This request could not be declined. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-6 border-t-2 border-ink py-5">
      <div>
        <p className="text-title font-bold">
          {person ? `${person.record.givenName} ${person.record.familyName}` : 'Not in your directory'}
        </p>
        <p className="text-body text-ink-muted">
          <code>{request.employeeRef}</code> · {request.kind} ·{' '}
          {formatAge(new Date(request.createdAt).getTime() / 1000, now)}
        </p>
        {error && (
          <p role="alert" className="mt-2 font-bold text-red-text">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <p className="text-small font-bold">Decline for good?</p>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void decline();
              }}
            >
              {busy ? 'Declining…' : 'Yes, decline'}
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Keep it
            </Button>
          </>
        ) : (
          <>
            <LinkButton href={`/employer/issue/${request.id}`}>Review and issue</LinkButton>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(true);
              }}
            >
              Decline
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function RequestInbox() {
  const [inbox, setInbox] = useState<Inbox>({ status: 'loading' });
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [now, setNow] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setInbox({ status: 'ready', requests: await fetchPendingRequests() });
    } catch (caught) {
      setInbox({ status: caught instanceof SignedOutError ? 'signed-out' : 'error' });
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    void listDirectory().then(setDirectory).catch(() => undefined);
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [refresh]);

  if (inbox.status === 'loading') return <p role="status">Loading requests…</p>;
  if (inbox.status === 'signed-out') {
    return (
      <Panel title="Sign in first">
        <LinkButton href="/employer">Sign in with this device</LinkButton>
      </Panel>
    );
  }
  if (inbox.status === 'error') {
    return <p role="status" className="font-bold">Could not load requests. Trying again…</p>;
  }
  if (inbox.requests.length === 0) {
    return <p role="status" className="text-body text-ink-muted">No requests waiting. This page refreshes on its own.</p>;
  }

  return (
    <ul className="border-b-2 border-ink" aria-live="polite">
      {inbox.requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          now={now}
          person={directory.find((entry) => entry.employeeRef === request.employeeRef)}
          onDecline={async () => {
            await declineRequest(request.id);
            await refresh();
          }}
        />
      ))}
    </ul>
  );
}
