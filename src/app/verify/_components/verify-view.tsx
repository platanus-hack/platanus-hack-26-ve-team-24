'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckList, CheckRow, Chip, ROW_STATUS } from '@/components/ui/check-list';
import { DropZone } from '@/components/ui/drop-zone';
import { Field } from '@/components/ui/field';
import { takeHandoffFile } from '@/lib/handoff';
import type { LookupFn } from '@/lib/credential/verify';
import { makeSample } from '../_lib/fixture';
import {
  fetchShareText,
  InputError,
  inputFromText,
  parseShareFragment,
  readInputFile,
} from '../_lib/load-input';
import type { LoadedInput, RowView } from '../_lib/types';
import { useVerification } from '../_lib/use-verification';
import { statusesOf } from '../_lib/verdict-copy';
import { CvView } from './cv-view';
import { ReceiptPanel } from './receipt-panel';
import { SealLayout } from './seal-layout';
import { TechnicalDetails } from './technical-details';
import { VerdictPanel } from './verdict-panel';

function liveMessage(rows: RowView[]): string {
  const latest = rows.findLast((row) => row.status !== 'PENDING');
  return latest ? `${latest.label}: ${ROW_STATUS[latest.status]}. ${latest.detail ?? ''}` : '';
}

export function VerifyView() {
  const verification = useVerification();
  const [input, setInput] = useState<LoadedInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [useFixture, setUseFixture] = useState(false);
  const sampleLookup = useRef<LookupFn | undefined>(undefined);
  const started = useRef(false);

  const start = useCallback(
    (next: LoadedInput, lookup?: LookupFn) => {
      sampleLookup.current = lookup;
      setError(null);
      setInput(next);
      if (next.kind === 'presentation') void verification.run(next, lookup);
    },
    [verification.run],
  );

  const attempt = useCallback(
    async (load: () => Promise<LoadedInput>) => {
      try {
        start(await load());
      } catch (caught) {
        setError(caught instanceof InputError ? caught.message : 'No se pudo leer.');
      }
    },
    [start],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setUseFixture(new URLSearchParams(window.location.search).has('fixture'));
    const share = parseShareFragment(window.location.hash);
    const file = takeHandoffFile();
    if (share) {
      void attempt(async () =>
        inputFromText(await fetchShareText(share.id, share.key), 'link', share.id),
      );
    } else if (file) {
      void attempt(async () => inputFromText(await readInputFile(file), 'file'));
    }
  }, [attempt]);

  const { rows, verdict, decoded, requests, running } = verification;

  const reset = () => {
    setInput(null);
    setPasted('');
  };

  if (!input) {
    return (
      <SealLayout>
        <div>
          <h1 className="max-w-[14ch] font-display text-display font-extrabold text-balance">
            Verifica una constancia.
          </h1>
          <p className="mt-8 max-w-[45ch] text-lead">
            Cinco comprobaciones corren en tu navegador. Solo ves los datos que el titular eligió
            mostrar, y cuántos quedan ocultos.
          </p>
        </div>
        <DropZone
          onFile={(file) => void attempt(async () => inputFromText(await readInputFile(file), 'file'))}
          label="Suelta una constancia para verificarla"
          hint="El archivo no sale de tu navegador."
        />
        {error ? (
          <p role="alert" className="flex max-w-[65ch] items-start gap-4 text-body font-bold text-fail">
            <Chip status="FAILED" />
            {error}
          </p>
        ) : null}
        <div className="border-t-4 border-ink pt-6">
          <h2 className="mb-4 font-display text-title font-extrabold">O pega el texto</h2>
          <Field
            label="Texto de la constancia"
            hint="Si tienes un enlace para compartir, ábrelo directamente."
          >
            <textarea
              rows={4}
              value={pasted}
              onChange={(event) => {
                setPasted(event.target.value);
              }}
              className="font-mono"
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button
              disabled={pasted.trim().length === 0}
              onClick={() => void attempt(async () => inputFromText(pasted, 'paste'))}
            >
              Verificar el texto
            </Button>
            {useFixture ? (
              <Button
                variant="secondary"
                onClick={() =>
                  void (async () => {
                    const sample = await makeSample();
                    start(sample.input, sample.lookup);
                  })()
                }
              >
                Probar con un ejemplo
              </Button>
            ) : null}
          </div>
        </div>
      </SealLayout>
    );
  }

  if (input.kind === 'cv') return <CvView input={input} onReset={reset} />;

  return (
    <>
      <SealLayout statuses={statusesOf(rows)}>
        <h1 className="font-display text-headline font-extrabold text-balance">
          Cinco comprobaciones, en orden.
        </h1>
        <p role="status" className="sr-only">
          {liveMessage(rows)}
        </p>
        <CheckList>
          {rows.map((row, index) => (
            <CheckRow
              key={row.code}
              index={index + 1}
              label={row.label}
              status={row.status}
              measured={row.measured}
              detail={row.detail}
            />
          ))}
        </CheckList>
      </SealLayout>
      <div className="flex flex-col gap-16 border-t-4 border-ink px-gutter py-16">
        {verdict ? (
          <VerdictPanel
            verdict={verdict}
            statuses={statusesOf(rows)}
            checking={running}
            onCheckAgain={() => {
              start(input, sampleLookup.current);
            }}
          />
        ) : null}
        {verdict ? (
          <ReceiptPanel
            requests={requests}
            shareId={input.shareId}
            claims={verdict.kind === 'AUTHENTIC' ? verdict.claims : null}
          />
        ) : null}
        {verdict?.kind === 'AUTHENTIC' && decoded ? (
          <TechnicalDetails verdict={verdict} decoded={decoded} />
        ) : null}
        <div>
          <Button variant="secondary" onClick={reset}>
            Verificar otra constancia
          </Button>
        </div>
      </div>
    </>
  );
}
