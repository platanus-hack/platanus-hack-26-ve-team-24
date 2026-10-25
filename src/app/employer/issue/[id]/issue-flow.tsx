'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow, type RowStatus } from '@/components/ui/check-list';
import { Disclosure } from '@/components/ui/disclosure';
import { Panel } from '@/components/ui/panel';
import { Receipt } from '@/components/ui/receipt';
import { fromB64u } from '@/lib/credential/jws';
import { loadSigner } from '@/lib/credential/keystore';
import { findEntry } from '@/lib/employer/directory';
import { listIdentities } from '@/lib/employer/identity';
import {
  IssueFailure,
  runIssue,
  type IssueProgress,
  type IssueRequest,
  type IssueStepId,
  type StepEvent,
} from '@/lib/employer/issue';
import { browserIssueDeps } from '@/lib/employer/issue-deps';
import {
  emptyFields,
  fieldsFromRecord,
  recordFromFields,
  type RecordErrors,
  type RecordFields,
} from '@/lib/employer/record-fields';
import { fetchPendingRequest, SignedOutError } from '@/lib/employer/requests-client';
import { useMe } from '@/lib/employer/use-me';
import { RecordForm } from '../../_components/record-form';

const ROWS: { step: IssueStepId; label: string }[] = [
  { step: 'OPENED', label: 'Request opened' },
  { step: 'SIGNED', label: 'Certificate signed' },
  { step: 'ANCHORED', label: 'Written to the ledger' },
  { step: 'DELIVERED', label: 'Delivered, encrypted' },
  { step: 'DISCARDED', label: 'Data discarded' },
];

type Load =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'missing' }
  | { status: 'ready'; request: IssueRequest };

const rowStatus = (event: StepEvent | undefined): RowStatus => event?.status ?? 'PENDING';

function describeHeader(issuerJwt: string): string {
  try {
    const [header = ''] = issuerJwt.split('.');
    return JSON.stringify(JSON.parse(new TextDecoder().decode(fromB64u(header))), null, 2);
  } catch {
    return 'Header unavailable';
  }
}

function IssuedReceipt({ request, account, progress }: { request: IssueRequest; account: string; progress: IssueProgress }) {
  const { credential, anchor, jwe } = progress;
  if (!credential) return null;
  const cipherKb = ((jwe ?? '').length / 1024).toFixed(1);
  return (
    <div className="flex flex-col gap-6">
      <Receipt
        title="What Constancia stored"
        rows={[
          { label: 'Request', value: request.id, mono: true },
          { label: 'Employer', value: account, mono: true },
          { label: 'Employee number', value: request.employeeRef, mono: true },
          { label: 'Kind', value: request.kind },
          { label: 'Status', value: 'ISSUED' },
          { label: 'Encrypted certificate', value: `${cipherKb} KB, until the holder collects it` },
          { label: 'Never stored', value: 'name, national ID, job title, salary, the certificate itself', muted: true },
        ]}
      />
      <Disclosure summary="Technical details">
        <dl className="flex flex-col gap-3 text-small">
          <div>
            <dt className="font-bold">Credential hash</dt>
            <dd className="break-all font-mono">{credential.credentialHash}</dd>
          </div>
          <div>
            <dt className="font-bold">Signing key</dt>
            <dd className="break-all font-mono">{credential.keyId}</dd>
          </div>
          <div>
            <dt className="font-bold">Ledger block</dt>
            <dd className="font-mono">{anchor?.blockNumber ?? 'recorded by an earlier attempt'}</dd>
          </div>
          <div>
            <dt className="font-bold">JWS header</dt>
            <dd>
              <pre className="overflow-x-auto font-mono">{describeHeader(credential.issuerJwt)}</pre>
            </dd>
          </div>
        </dl>
      </Disclosure>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/employer/requests">Back to requests</LinkButton>
        <LinkButton variant="secondary" href="/employer/issued">
          See issued certificates
        </LinkButton>
      </div>
    </div>
  );
}

export function IssueFlow({ requestId }: { requestId: string }) {
  const me = useMe();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [fields, setFields] = useState<RecordFields>(emptyFields);
  const [errors, setErrors] = useState<RecordErrors>({});
  const [inDirectory, setInDirectory] = useState(true);
  const [events, setEvents] = useState<Partial<Record<IssueStepId, StepEvent>>>({});
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const progress = useRef<IssueProgress>({});
  const submitted = useRef(false);

  const accountReady = me.status === 'in';

  useEffect(() => {
    if (!accountReady) return;
    let active = true;
    async function open() {
      try {
        const pending = await fetchPendingRequest(requestId);
        if (!active) return;
        if (!pending) {
          setLoad({ status: 'missing' });
          return;
        }
        const entry = await findEntry(pending.employeeRef);
        if (!active) return;
        setInDirectory(entry !== null);
        if (entry) setFields(fieldsFromRecord(entry.record));
        setLoad({ status: 'ready', request: pending });
      } catch (caught) {
        if (active) setLoad({ status: caught instanceof SignedOutError ? 'signed-out' : 'missing' });
      }
    }
    void open();
    return () => {
      active = false;
    };
  }, [accountReady, requestId]);

  if (me.status === 'loading') return <p role="status">Checking your session…</p>;
  if (me.status === 'out' || load.status === 'signed-out') {
    return (
      <Panel title="Sign in first">
        <LinkButton href="/employer">Sign in with this device</LinkButton>
      </Panel>
    );
  }
  if (load.status === 'loading') return <p role="status">Opening the request…</p>;
  if (load.status === 'missing' && !done) {
    return (
      <Panel title="This request is no longer waiting">
        <p className="mb-6 text-body text-ink-muted">It may have been issued, declined or expired.</p>
        <LinkButton href="/employer/requests">Back to requests</LinkButton>
      </Panel>
    );
  }
  if (load.status !== 'ready') return null;

  const { request } = load;
  const account = me.me.account;
  const endDateMode = request.kind === 'CURRENT' ? 'hidden' : 'required';

  async function execute() {
    if (submitted.current) return; // double submit
    submitted.current = true;
    setBusy(true);
    setStarted(true);
    try {
      let record = recordFromFields({ ...fields, endDate: request.kind === 'CURRENT' ? '' : fields.endDate });
      if (record.ok && request.kind === 'PAST' && !record.record.endDate) {
        record = { ok: false, errors: { endDate: 'A past job needs an end date' } };
      }
      if (!record.ok) {
        setErrors(record.errors);
        setStarted(false);
        return;
      }
      setErrors({});
      const identities = await listIdentities();
      const identity = identities.find((item) => item.account === account);
      const signer = identity ? await loadSigner(identity.signerName) : null;
      if (!signer) {
        setEvents({ SIGNED: { step: 'SIGNED', status: 'FAILED', detail: 'The signing key for this organization is not on this device.' } });
        return;
      }
      const deps = browserIssueDeps({
        account,
        signer,
        discard: () => {
          setFields(emptyFields());
        },
      });
      await runIssue({ request, record: record.record }, deps, progress.current, (event) => {
        setEvents((current) => ({ ...current, [event.step]: event }));
      });
      setDone(true);
    } catch (caught) {
      if (!(caught instanceof IssueFailure)) {
        setEvents((current) => ({ ...current, SIGNED: { step: 'SIGNED', status: 'FAILED', detail: 'Something went wrong. Try again.' } }));
      }
    } finally {
      submitted.current = false;
      setBusy(false);
    }
  }

  const failed = Object.values(events).find((event) => event.status === 'FAILED');

  return (
    <div className="flex flex-col gap-8">
      {!started && (
        <p className="max-w-[65ch] text-small font-bold">
          This data never leaves your browser except inside the encrypted certificate.
        </p>
      )}
      {!inDirectory && !started && (
        <p role="status" className="max-w-[65ch] text-body text-ink-muted">
          This employee number is not in your directory. Fill in the details by hand.
        </p>
      )}
      {!done && (
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void execute();
          }}
        >
          <RecordForm
            fields={fields}
            errors={errors}
            onChange={setFields}
            endDate={endDateMode}
            disabled={busy || progress.current.credential !== undefined}
          />
          {!started && (
            <p className="max-w-[65ch] text-small text-ink-muted">
              Issuing writes a permanent record: a hash. It contains no personal data.
            </p>
          )}
          {!failed && (
            <div>
              <Button type="submit" disabled={busy}>
                {busy ? 'Issuing…' : 'Issue certificate'}
              </Button>
            </div>
          )}
        </form>
      )}
      {started && (
        <div aria-live="polite">
          <CheckList title={done ? 'Certificate issued' : 'Issuing'}>
            {ROWS.map(({ step, label }, index) => (
              <CheckRow
                key={step}
                index={index + 1}
                label={label}
                status={rowStatus(events[step])}
                measured={events[step]?.measured}
                detail={events[step]?.detail}
              />
            ))}
          </CheckList>
        </div>
      )}
      {failed && !busy && (
        <div>
          <Button
            onClick={() => {
              void execute();
            }}
          >
            Retry from here
          </Button>
        </div>
      )}
      {done && <IssuedReceipt request={request} account={account} progress={progress.current} />}
    </div>
  );
}
