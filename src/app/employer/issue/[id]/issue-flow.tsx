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
  REQUEST_KIND_LABELS,
  type RecordErrors,
  type RecordFields,
} from '@/lib/employer/record-fields';
import { fetchPendingRequest, SignedOutError } from '@/lib/employer/requests-client';
import { useMe } from '@/lib/employer/use-me';
import { RecordForm } from '../../_components/record-form';
import { SignInFirst } from '../../_components/sign-in-first';

const ROWS: { step: IssueStepId; label: string }[] = [
  { step: 'OPENED', label: 'Solicitud abierta' },
  { step: 'SIGNED', label: 'Constancia firmada' },
  { step: 'ANCHORED', label: 'Escrita en el registro' },
  { step: 'DELIVERED', label: 'Entregada, cifrada' },
  { step: 'DISCARDED', label: 'Datos descartados' },
];

type Load =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'missing' }
  | { status: 'ready'; request: IssueRequest };

const rowStatus = (event: StepEvent | undefined): RowStatus => event?.status ?? 'PENDING';

function describeHeader(issuerJwt: string): string {
  const [header = ''] = issuerJwt.split('.');
  return JSON.stringify(JSON.parse(new TextDecoder().decode(fromB64u(header))), null, 2);
}

function IssuedReceipt({ request, account, progress }: { request: IssueRequest; account: string; progress: IssueProgress }) {
  const { credential, anchor, jwe } = progress;
  if (!credential) return null;
  const cipherKb = ((jwe ?? '').length / 1024).toFixed(1);
  return (
    <div className="flex flex-col gap-6">
      <Receipt
        title="Lo que guardó Constancia"
        rows={[
          { label: 'Solicitud', value: request.id, mono: true },
          { label: 'Empleador', value: account, mono: true },
          { label: 'Número de empleado', value: request.employeeRef, mono: true },
          { label: 'Tipo', value: REQUEST_KIND_LABELS[request.kind] },
          { label: 'Estado', value: 'Emitida' },
          { label: 'Constancia cifrada', value: `${cipherKb} KB, hasta que el titular la recoja` },
          { label: 'Nunca guardó', value: 'nombre, cédula, cargo, salario ni la constancia en sí', muted: true },
        ]}
      />
      <Disclosure summary="Detalles técnicos">
        <dl className="flex flex-col gap-3 text-small">
          <div>
            <dt className="font-bold">Huella de la constancia</dt>
            <dd className="break-all font-mono">{credential.credentialHash}</dd>
          </div>
          <div>
            <dt className="font-bold">Clave de firma</dt>
            <dd className="break-all font-mono">{credential.keyId}</dd>
          </div>
          <div>
            <dt className="font-bold">Bloque del registro</dt>
            <dd className="font-mono">{anchor?.blockNumber ?? 'registrado en un intento anterior'}</dd>
          </div>
          <div>
            <dt className="font-bold">Encabezado JWS</dt>
            <dd>
              <pre className="overflow-x-auto font-mono">{describeHeader(credential.issuerJwt)}</pre>
            </dd>
          </div>
        </dl>
      </Disclosure>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/employer/requests">Volver a las solicitudes</LinkButton>
        <LinkButton variant="secondary" href="/employer/issued">
          Ver las constancias emitidas
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

  if (me.status === 'loading') return <p role="status">Comprobando tu sesión…</p>;
  if (me.status === 'out' || load.status === 'signed-out') return <SignInFirst />;
  if (load.status === 'loading') return <p role="status">Abriendo la solicitud…</p>;
  if (load.status === 'missing' && !done) {
    return (
      <Panel title="Esta solicitud ya no está pendiente">
        <p className="mb-6 text-body text-ink-muted">Puede que ya se haya emitido, rechazado o vencido.</p>
        <LinkButton href="/employer/requests">Volver a las solicitudes</LinkButton>
      </Panel>
    );
  }
  if (load.status !== 'ready') return null;

  const { request } = load;
  const account = me.me.account;
  const endDateMode = request.kind === 'CURRENT' ? 'hidden' : 'required';

  async function execute() {
    if (submitted.current) return; // evita el doble envío
    submitted.current = true;
    setBusy(true);
    setStarted(true);
    try {
      let record = recordFromFields({ ...fields, endDate: request.kind === 'CURRENT' ? '' : fields.endDate });
      if (record.ok && request.kind === 'PAST' && !record.record.endDate) {
        record = { ok: false, errors: { endDate: 'Un empleo anterior necesita fecha de egreso' } };
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
        setEvents({ SIGNED: { step: 'SIGNED', status: 'FAILED', detail: 'La clave de firma de esta organización no está en este dispositivo.' } });
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
        setEvents((current) => ({ ...current, SIGNED: { step: 'SIGNED', status: 'FAILED', detail: 'Algo salió mal. Inténtalo de nuevo.' } }));
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
          Estos datos solo salen de tu navegador dentro de la constancia cifrada.
        </p>
      )}
      {!inDirectory && !started && (
        <p role="status" className="max-w-[65ch] text-body text-ink-muted">
          Este número de empleado no está en tu directorio. Completa los datos a mano.
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
              Emitir deja una huella permanente en el registro. La huella no contiene datos personales.
            </p>
          )}
          {!failed && (
            <div>
              <Button type="submit" disabled={busy}>
                {busy ? 'Emitiendo…' : 'Emitir la constancia'}
              </Button>
            </div>
          )}
        </form>
      )}
      {started && (
        <div aria-live="polite">
          <CheckList title={done ? 'Constancia emitida' : 'Emitiendo'}>
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
            Reintentar desde aquí
          </Button>
        </div>
      )}
      {done && <IssuedReceipt request={request} account={account} progress={progress.current} />}
    </div>
  );
}
