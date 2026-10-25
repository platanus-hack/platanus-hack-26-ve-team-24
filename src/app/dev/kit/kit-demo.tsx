'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckList, CheckRow, ROW_STATUS } from '@/components/ui/check-list';
import type { RowStatus } from '@/components/ui/check-list';
import { ClaimList } from '@/components/ui/claim-list';
import type { ClaimView } from '@/components/ui/claim-list';
import { DropZone } from '@/components/ui/drop-zone';
import { Seal, SealLegend } from '@/components/ui/seal';
import { Verdict } from '@/components/ui/verdict';

const SEGMENTS = 5;
const STAGGER_MS = 120;
const TICK_MS = 600;
// la corrida fallida se rompe en la tercera comprobación (Firma); las dos siguientes no se examinan
const FAIL_AT = 2;

const uniform = (status: RowStatus): RowStatus[] => Array.from({ length: SEGMENTS }, () => status);

const ALL_STATUSES = Object.keys(ROW_STATUS) as RowStatus[];

// datos ficticios: el kit nunca muestra una constancia real
const VERIFIER_CHECKS = [
  {
    label: 'Constancia',
    detail: 'El archivo es una credencial válida y nadie la alteró.',
    measured: '1.842 bytes',
  },
  {
    label: 'Acreditado',
    detail: 'El consorcio acreditó a este empleador en el registro.',
    measured: 'Logística Orinoco, C.A.',
  },
  { label: 'Firma', detail: 'La firmó la clave del empleador, no otra.', measured: 'ES256 · 3,1 ms' },
  {
    label: 'Titular',
    detail: 'Quien la comparte tiene la clave a la que fue emitida.',
    measured: 'clave del titular',
  },
  {
    label: 'Registro',
    detail: 'Su huella está anclada en el registro público, sin revocar.',
    measured: 'Bloque 18.442.107',
    href: 'https://sepolia.etherscan.io/',
  },
];

interface CheckRun {
  mode: 'ok' | 'fail';
  // las filas antes de `tick` terminaron; la fila `tick` se está comprobando
  tick: number;
}

function statusOf(index: number, run: CheckRun | null): RowStatus {
  if (!run) return 'PENDING';
  if (run.mode === 'fail' && index > FAIL_AT) {
    return run.tick > FAIL_AT ? 'NOT_EXAMINED' : 'PENDING';
  }
  if (index < run.tick) {
    return run.mode === 'fail' && index === FAIL_AT ? 'FAILED' : 'VERIFIED';
  }
  return index === run.tick ? 'CHECKING' : 'PENDING';
}

// cada estado del sello, siempre con su palabra
export function SealStates() {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-7">
      {ALL_STATUSES.map((status) => (
        <li key={status} className="flex flex-col gap-3">
          <Seal statuses={uniform(status)} size={96} />
          <span className="text-small font-bold tracking-wide uppercase">{ROW_STATUS[status]}</span>
        </li>
      ))}
    </ul>
  );
}

export function SealStaggerDemo() {
  const [closed, setClosed] = useState(false);
  const statuses = uniform(closed ? 'DONE' : 'PENDING');

  return (
    <div className="grid border-4 border-ink md:grid-cols-12">
      <div className="flex flex-col justify-between gap-10 bg-marigold p-6 md:col-span-7 md:p-10">
        <div className="flex justify-center">
          <Seal statuses={statuses} stagger={STAGGER_MS} size={224} />
        </div>
        <SealLegend statuses={closed ? statuses : undefined} />
      </div>
      <div className="flex flex-col justify-between gap-6 p-6 md:col-span-5">
        <p className="max-w-[40ch] text-body">
          Con <code>stagger</code>, cada segmento cambia {STAGGER_MS} ms después del anterior, en
          el orden de las comprobaciones. Con movimiento reducido, el cambio es instantáneo.
        </p>
        <Button
          aria-pressed={closed}
          onClick={() => {
            setClosed((current) => !current);
          }}
        >
          {closed ? 'Abrir el sello' : 'Cerrar el sello'}
        </Button>
      </div>
    </div>
  );
}

export function CheckListDemo() {
  const [run, setRun] = useState<CheckRun | null>(null);

  useEffect(() => {
    if (!run) return undefined;
    const lastTick = run.mode === 'ok' ? VERIFIER_CHECKS.length : FAIL_AT + 1;
    if (run.tick >= lastTick) return undefined;
    const timer = setTimeout(() => {
      setRun({ mode: run.mode, tick: run.tick + 1 });
    }, TICK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [run]);

  const statuses = VERIFIER_CHECKS.map((_, i) => statusOf(i, run));

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() => {
              setRun({ mode: 'ok', tick: 0 });
            }}
          >
            Verificar
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setRun({ mode: 'fail', tick: 0 });
            }}
          >
            Verificar una constancia alterada
          </Button>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
          <Seal statuses={statuses} size={160} />
          <CheckList>
            {VERIFIER_CHECKS.map((check, i) => (
              <CheckRow
                key={check.label}
                index={i + 1}
                label={check.label}
                detail={check.detail}
                status={statuses[i]!}
                measured={statuses[i] === 'VERIFIED' ? check.measured : undefined}
                href={check.href}
              />
            ))}
          </CheckList>
        </div>
      </div>

      <CheckList title="Todos los estados">
        {ALL_STATUSES.map((status, i) => (
          <CheckRow key={status} index={i + 1} label="Comprobación de ejemplo" status={status} />
        ))}
      </CheckList>
    </div>
  );
}

type VerdictKind = 'AUTHENTIC' | 'NOT_AUTHENTIC' | 'UNAVAILABLE';

const VERDICTS: {
  kind: VerdictKind;
  title: string;
  reason: string;
  statuses: RowStatus[];
}[] = [
  {
    kind: 'AUTHENTIC',
    title: 'VÁLIDA',
    reason: 'La emitió Logística Orinoco, C.A. (empleador ficticio). Las cinco comprobaciones pasaron.',
    statuses: uniform('VERIFIED'),
  },
  {
    kind: 'NOT_AUTHENTIC',
    title: 'NO VÁLIDA',
    reason: 'Falló en: Firma. Se esperaba la clave del empleador y se encontró otra.',
    statuses: ['VERIFIED', 'VERIFIED', 'FAILED', 'NOT_EXAMINED', 'NOT_EXAMINED'],
  },
  {
    kind: 'UNAVAILABLE',
    title: 'NO SE PUEDE VERIFICAR AHORA',
    reason: 'El registro no respondió a tiempo. Inténtalo de nuevo en un momento.',
    statuses: ['VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'UNAVAILABLE'],
  },
];

export function VerdictDemo() {
  const [round, setRound] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          setRound((current) => current + 1);
        }}
      >
        Repetir la animación
      </Button>
      {VERDICTS.map((verdict) => (
        // la key remonta el veredicto para que el color vuelva a entrar
        <Verdict
          key={`${verdict.kind}-${round}`}
          kind={verdict.kind}
          title={verdict.title}
          reason={verdict.reason}
          statuses={verdict.statuses}
          issuerDomain="orinoco-logistica.example"
        />
      ))}
    </div>
  );
}

// una fila por estado; los dos interruptores están vivos, el resto es fijo
export function ClaimListDemo() {
  const [shared, setShared] = useState({ tenure: true, salary: false });

  const claims: ClaimView[] = [
    { name: 'employer', label: 'Empleador', value: 'Logística Orinoco, C.A.', state: 'shown' },
    { name: 'position', label: 'Cargo', value: 'Analista (ficticio)', state: 'hidden' },
    {
      name: 'tenure',
      label: 'Antigüedad',
      value: '2 años',
      state: shared.tenure ? 'on' : 'off',
    },
    {
      name: 'salary',
      label: 'Banda salarial',
      value: 'Banda C',
      state: shared.salary ? 'on' : 'off',
    },
  ];

  return (
    <div className="max-w-xl">
      <ClaimList
        caption="Elige qué muestra este enlace. Lo oculto se queda en tu bóveda."
        claims={claims}
        onToggle={(name, next) => {
          setShared((current) => ({ ...current, [name]: next }));
        }}
      />
    </div>
  );
}

export function DropZoneDemo() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <DropZone
          label="Suelta una constancia"
          hint="El archivo no sale de tu navegador."
          onFile={setFile}
        />
        <p role="status" className="text-small">
          {file ? (
            <>
              <span className="font-bold">{file.name}</span> ·{' '}
              <span className="tnum">{file.size.toLocaleString('es-VE')}</span> bytes
            </>
          ) : null}
        </p>
      </div>
      <DropZone
        label="Suelta una constancia"
        hint="Desactivada mientras corre una verificación."
        disabled
        onFile={() => undefined}
      />
    </div>
  );
}
