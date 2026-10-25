'use client';

import { useRef, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow, type RowStatus } from '@/components/ui/check-list';
import { Receipt } from '@/components/ui/receipt';
import { loadSigner } from '@/lib/credential/keystore';
import { downloadPdf, openPdf } from '@/lib/document/download';
import { listIdentities } from '@/lib/employer/identity';
import {
  IssueFailure,
  runIssue,
  type IssueProgress,
  type IssueStepId,
  type StepEvent,
} from '@/lib/employer/issue';
import { browserIssueDeps } from '@/lib/employer/issue-deps';
import {
  emptyFields,
  recordFromFields,
  type RecordErrors,
  type RecordFields,
} from '@/lib/employer/record-fields';
import type { Address } from '@/lib/credential/types';
import { RecordForm } from './record-form';

const ROWS: { step: IssueStepId; label: string }[] = [
  { step: 'SIGNED', label: 'Constancia firmada' },
  { step: 'ANCHORED', label: 'Huella escrita en el registro' },
  { step: 'PACKAGED', label: 'PDF armado con el token adentro' },
  { step: 'RECORDED', label: 'Anotada en tus emitidas' },
];

const rowStatus = (event: StepEvent | undefined): RowStatus => event?.status ?? 'PENDING';

function pdfName(fields: RecordFields): string {
  const slug = `${fields.givenName}-${fields.familyName}`
    .normalize('NFD')
    .replaceAll(/[^\w-]+/g, '')
    .toLowerCase();
  return `constancia-${slug || 'trabajo'}.pdf`;
}

export function IssueFlow({ account, name }: { account: Address; name: string }) {
  const [fields, setFields] = useState<RecordFields>(emptyFields);
  const [errors, setErrors] = useState<RecordErrors>({});
  const [events, setEvents] = useState<Partial<Record<IssueStepId, StepEvent>>>({});
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<{ pdf: Uint8Array; file: string; hash: string } | null>(null);
  const progress = useRef<IssueProgress>({});
  const submitted = useRef(false);

  async function execute() {
    if (submitted.current) return; // evita el doble envío
    submitted.current = true;
    setBusy(true);
    try {
      const record = recordFromFields(fields);
      if (!record.ok) {
        setErrors(record.errors);
        return;
      }
      setErrors({});
      setStarted(true);
      const identity = (await listIdentities()).find((item) => item.account === account);
      const signer = identity ? await loadSigner(identity.signerName) : null;
      if (!signer) {
        setEvents({
          SIGNED: {
            step: 'SIGNED',
            status: 'FAILED',
            detail: 'La clave de firma de esta organización no está en este dispositivo.',
          },
        });
        return;
      }
      const deps = browserIssueDeps({ account, signer, issuerName: name || 'Tu organización' });
      const result = await runIssue({ record: record.record }, deps, progress.current, (event) => {
        setEvents((current) => ({ ...current, [event.step]: event }));
      });
      const { pdf, credential } = result;
      if (pdf && credential) {
        const file = pdfName(fields);
        setDone({ pdf, file, hash: credential.credentialHash });
        downloadPdf(file, pdf);
      }
    } catch (caught) {
      if (!(caught instanceof IssueFailure)) {
        setEvents((current) => ({
          ...current,
          SIGNED: {
            step: 'SIGNED',
            status: 'FAILED',
            detail: 'Algo salió mal. Inténtalo de nuevo.',
          },
        }));
      }
    } finally {
      submitted.current = false;
      setBusy(false);
    }
  }

  function another() {
    progress.current = {};
    setFields(emptyFields());
    setEvents({});
    setStarted(false);
    setDone(null);
  }

  const failed = Object.values(events).find((event) => event.status === 'FAILED');

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body">
        Sesión iniciada como <strong>{name || 'tu organización'}</strong>
      </p>
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
            disabled={busy || progress.current.credential !== undefined}
          />
          {!started && (
            <p className="max-w-[65ch] text-small text-ink-muted">
              Emitir deja una huella permanente en el registro; la huella no contiene datos
              personales. Los datos solo viajan dentro del PDF que se descarga en este navegador.
            </p>
          )}
          {!failed && (
            <div>
              <Button type="submit" disabled={busy}>
                {busy ? 'Emitiendo…' : 'Emitir y descargar el PDF'}
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
      {done && (
        <div className="flex flex-col gap-6">
          <Receipt
            title="Tu PDF está listo"
            rows={[
              { label: 'Archivo', value: done.file, mono: true },
              { label: 'Huella en el registro', value: done.hash, mono: true },
              {
                label: 'Dentro del PDF',
                value: 'datos legibles, el token firmado y la clave del titular',
              },
              {
                label: 'Constancia no guarda',
                value: 'nada de esto: ni datos ni el PDF',
                muted: true,
              },
            ]}
            footnote="Entrégale este archivo al trabajador. Con él puede demostrar su empleo en la página Verificar y elegir qué datos mostrar en Compartir."
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                downloadPdf(done.file, done.pdf);
              }}
            >
              Descargar de nuevo
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                openPdf(done.pdf);
              }}
            >
              Abrir el PDF
            </Button>
            <LinkButton variant="secondary" href="/verify">
              Ir a verificar
            </LinkButton>
            <Button variant="quiet" onClick={another}>
              Emitir otra constancia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
