'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckList, CheckRow, Chip, ROW_STATUS } from '@/components/ui/check-list';
import { DropZone } from '@/components/ui/drop-zone';
import { Field } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import { setHandoffFile, takeHandoffFile } from '@/lib/handoff';
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
import { statusesOf, visibleRows } from '../_lib/verdict-copy';
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
  const router = useRouter();
  const verification = useVerification();
  const file = useRef<File | null>(null); // the PDF that was attached, to hand it to Compartir
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

  const fromFile = useCallback(async (picked: File) => {
    const loaded = inputFromText(await readInputFile(picked), 'file');
    file.current = picked;
    return loaded;
  }, []);

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
    const handed = takeHandoffFile();
    if (share) {
      void attempt(async () =>
        inputFromText(await fetchShareText(share.id, share.key), 'link', share.id),
      );
    } else if (handed) {
      void attempt(() => fromFile(handed));
    }
  }, [attempt, fromFile]);

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
          onFile={(picked) => void attempt(() => fromFile(picked))}
          label="Suelta el PDF de una constancia"
          hint="Lo que el PDF dice se lee de su token firmado. El archivo no sale de tu navegador."
        />
        {error ? (
          <p
            role="alert"
            className="flex max-w-[65ch] items-start gap-4 text-body font-bold text-fail"
          >
            <Chip status="FAILED" />
            {error}
          </p>
        ) : null}
        <div className="border-t-4 border-ink pt-6">
          <h2 className="mb-4 font-display text-title font-extrabold">O pega el token</h2>
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
          {visibleRows(rows).map((row, index) => (
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
        {verdict?.kind === 'AUTHENTIC' && !verdict.keyBound && file.current ? (
          <Panel title="Esta es la constancia completa">
            <p className="mb-6 max-w-[65ch] text-body">
              El PDF trae todos los datos. Para mostrar a un tercero solo una parte y que aun así
              pueda comprobarla, elige qué datos compartir y genera una presentación.
            </p>
            <Button
              onClick={() => {
                if (file.current) setHandoffFile(file.current);
                router.push('/present');
              }}
            >
              Elegir qué datos compartir
            </Button>
          </Panel>
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
