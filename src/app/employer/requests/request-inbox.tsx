'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { listDirectory, type DirectoryEntry } from '@/lib/employer/directory';
import { REQUEST_KIND_LABELS } from '@/lib/employer/record-fields';
import {
  declineRequest,
  fetchPendingRequests,
  SignedOutError,
  type PendingRequest,
} from '@/lib/employer/requests-client';
import { formatAge } from '@/lib/ledger/format';
import { SignInFirst } from '../_components/sign-in-first';

const POLL_MS = 3000;

type Inbox =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'ready'; requests: PendingRequest[] };

function RequestRow({
  request,
  person,
  now,
  onDecline,
}: {
  request: PendingRequest;
  person: DirectoryEntry | undefined;
  now: number;
  onDecline: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-6 border-t-2 border-ink py-5">
      <div>
        <p className="text-title font-bold">
          {person ? `${person.record.givenName} ${person.record.familyName}` : 'No está en tu directorio'}
        </p>
        <p className="text-body text-ink-muted">
          <code>{request.employeeRef}</code> · {REQUEST_KIND_LABELS[request.kind]} ·{' '}
          {formatAge(new Date(request.createdAt).getTime() / 1000, now)}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <LinkButton href={`/employer/issue/${request.id}`}>Revisar y emitir</LinkButton>
        <Button variant="secondary" onClick={onDecline}>
          Rechazar
        </Button>
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

  if (inbox.status === 'loading') return <p role="status">Cargando las solicitudes…</p>;
  if (inbox.status === 'signed-out') return <SignInFirst />;
  if (inbox.status === 'error') {
    return (
      <p role="status" className="font-bold">
        No se pudieron cargar las solicitudes. Reintentando…
      </p>
    );
  }
  if (inbox.requests.length === 0) {
    return (
      <p role="status" className="text-body">
        No hay solicitudes pendientes. Esta página se actualiza sola.
      </p>
    );
  }

  return (
    <ul className="border-b-2 border-ink" aria-live="polite">
      {inbox.requests.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          now={now}
          person={directory.find((entry) => entry.employeeRef === request.employeeRef)}
          onDecline={() => {
            void declineRequest(request.id).then(refresh).catch(() => undefined);
          }}
        />
      ))}
    </ul>
  );
}
