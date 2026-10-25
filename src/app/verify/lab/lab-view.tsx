'use client';

import { useEffect, useState } from 'react';
import { useVerification } from '@/app/verify/_lib/use-verification';
import { failureReason, statusesOf, unavailableReason, VERDICT_TITLE } from '@/app/verify/_lib/verdict-copy';
import { SealLayout } from '@/app/verify/_components/seal-layout';
import { Button, LinkButton } from '@/components/ui/button';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Verdict } from '@/components/ui/verdict';
import { ATTACK_TITLES, runAttack, type AttackId, type Sample } from '@/lib/credential/attacks';
import type { Verdict as VerdictResult } from '@/lib/credential/verify';
import { downloadText } from '@/lib/vault/certificate-info';
import { ATTACK_CARDS, presentOriginal } from '@/lib/vault/lab';
import { loadSample } from '@/lib/vault/lab-sample';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; sample: Sample };

interface Run {
  title: string;
  changed?: string;
  presentation: string;
}

function reasonOf(verdict: VerdictResult): string {
  if (verdict.kind === 'NOT_AUTHENTIC') return failureReason(verdict.failedAt, verdict.reason);
  if (verdict.kind === 'UNAVAILABLE') return unavailableReason(verdict.reason);
  return 'Pasa las cinco comprobaciones.';
}

function Result({ run, verification }: { run: Run; verification: ReturnType<typeof useVerification> }) {
  const { rows, verdict } = verification;
  const statuses = statusesOf(rows);
  return (
    <section aria-label={`Resultado: ${run.title}`} className="border-t-4 border-ink">
      <SealLayout statuses={statuses}>
        <div>
          <h2 className="font-display text-headline font-extrabold text-balance">{run.title}</h2>
          {run.changed ? <p className="mt-4 max-w-[55ch] text-lead">{run.changed}</p> : null}
        </div>
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
      {verdict ? (
        <div className="px-gutter py-12">
          <Verdict
            kind={verdict.kind}
            title={VERDICT_TITLE[verdict.kind]}
            reason={reasonOf(verdict)}
            statuses={statuses}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-4 px-gutter pb-16">
        <Button
          variant="secondary"
          onClick={() => {
            downloadText('constancia-falsa.sdjwt', run.presentation);
          }}
        >
          Descargar el archivo
        </Button>
      </div>
    </section>
  );
}

export function LabView() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [run, setRun] = useState<Run | null>(null);
  const verification = useVerification();
  const { run: verify } = verification;

  useEffect(() => {
    const prepare = async () => {
      try {
        setLoad({ status: 'ready', sample: await loadSample() });
      } catch {
        setLoad({ status: 'error' });
      }
    };
    void prepare();
  }, []);

  if (load.status === 'loading') {
    return (
      <p role="status" className="px-gutter pb-16 text-body">
        Preparando la constancia de ejemplo…
      </p>
    );
  }
  if (load.status === 'error') {
    return (
      <section className="mx-gutter mb-16 border-4 border-ink bg-marigold p-6 text-ink">
        <h2 className="font-display text-title font-extrabold">
          La constancia de ejemplo todavía no está disponible
        </h2>
        <p className="mt-2 text-body">Inténtalo de nuevo en un momento.</p>
      </section>
    );
  }
  const { sample } = load;

  async function start(next: Run) {
    setRun(next);
    await verify({ text: next.presentation, kind: 'presentation', origin: 'sample' });
  }

  async function runOriginal() {
    await start({ title: 'La constancia original', presentation: await presentOriginal(sample) });
  }

  async function runAttackCard(id: AttackId) {
    const { presentation, attack } = await runAttack(id, sample);
    await start({ title: attack.title, changed: attack.changed, presentation });
  }

  return (
    <>
      <section className="grid gap-10 border-t-4 border-ink px-gutter py-12 md:grid-cols-2">
        <div>
          <h2 className="font-display text-headline font-extrabold">La original</h2>
          <p className="mt-4 max-w-[55ch] text-body">
            Esta constancia de ejemplo es ficticia, y la clave de su titular es pública a propósito
            para que cualquiera pueda usar el laboratorio. Pasa las cinco comprobaciones.
          </p>
        </div>
        <div className="md:self-end">
          <Button
            variant="secondary"
            disabled={verification.running}
            onClick={() => void runOriginal()}
          >
            Verificar la original
          </Button>
        </div>
      </section>

      <ul className="grid border-t-4 border-ink md:grid-cols-2">
        {ATTACK_CARDS.map((card) => (
          <li
            key={card.id}
            className="flex flex-col justify-between gap-6 border-b-2 border-ink px-gutter py-8 md:odd:border-r-2"
          >
            <h2 className="font-display text-title font-extrabold">{ATTACK_TITLES[card.id]}</h2>
            <div>
              <Button disabled={verification.running} onClick={() => void runAttackCard(card.id)}>
                Probar
              </Button>
            </div>
          </li>
        ))}
        <li className="flex flex-col justify-between gap-6 bg-marigold px-gutter py-8 text-ink md:col-span-2">
          <div>
            <h2 className="font-display text-title font-extrabold">Revocar la constancia</h2>
            <p className="mt-2 max-w-[60ch] text-body">
              Una constancia revocada falla en la comprobación «Registro». Pídele al empleador que
              la revoque y verifícala de nuevo.
            </p>
          </div>
          <div>
            <LinkButton variant="secondary" href="/employer/issued">
              Abrir las constancias emitidas del empleador
            </LinkButton>
          </div>
        </li>
      </ul>

      {run ? (
        <>
          <Result run={run} verification={verification} />
          <div className="px-gutter pb-16">
            <Button
              variant="quiet"
              onClick={() => {
                setRun(null);
              }}
            >
              Empezar de nuevo
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}
