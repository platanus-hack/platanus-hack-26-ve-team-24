'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LinkButton } from '@/components/ui/button';
import type { RowStatus } from '@/components/ui/check-list';
import { DropZone } from '@/components/ui/drop-zone';
import { Seal, SealLegend } from '@/components/ui/seal';
import { setHandoffFile } from '@/lib/handoff';

const SEGMENT_STAGGER_MS = 120;
// el sello termina de cerrarse (5 segmentos escalonados + la última transición) antes de navegar
const CLOSE_MS = SEGMENT_STAGGER_MS * 5 + 240;

const OPEN: RowStatus[] = ['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING'];
const CLOSED: RowStatus[] = ['DONE', 'DONE', 'DONE', 'DONE', 'DONE'];

export function Hero() {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  function handleFile(file: File) {
    setHandoffFile(file);
    setClosing(true);
    timer.current = setTimeout(() => {
      router.push('/verify');
    }, CLOSE_MS);
  }

  const statuses = closing ? CLOSED : OPEN;

  return (
    <section className="grid flex-1 md:grid-cols-12">
      <div className="flex flex-col justify-between gap-10 bg-marigold px-gutter py-10 md:col-span-5 md:py-14">
        <div className="flex flex-1 items-center justify-center">
          <Seal
            statuses={statuses}
            stagger={SEGMENT_STAGGER_MS}
            size={320}
            className="hidden lg:grid"
          />
          <Seal statuses={statuses} stagger={SEGMENT_STAGGER_MS} size={176} className="lg:hidden" />
        </div>
        <SealLegend statuses={closing ? statuses : undefined} />
      </div>

      <div className="flex flex-col gap-10 px-gutter py-12 md:col-span-7 md:py-16 lg:px-16">
        <div>
          <h1 className="max-w-[12ch] font-display text-display font-extrabold text-balance">
            Constancias que se prueban solas.
          </h1>
          <p className="mt-8 max-w-[40ch] text-lead">
            Un banco o un consulado comprueba un solo dato en segundos. Todo lo demás queda
            oculto.
          </p>
        </div>

        <div className="mt-auto grid gap-6 xl:grid-cols-[1fr_18.75rem] xl:items-stretch">
          <DropZone
            onFile={handleFile}
            label="Suelta una constancia para verificarla"
            hint="El archivo no sale de tu navegador."
            disabled={closing}
            compact
          />
          <div className="flex flex-wrap gap-4 xl:flex-col xl:justify-between">
            <LinkButton href="/verify">Verificar una constancia</LinkButton>
            <LinkButton href="/vault" variant="secondary">
              Abrir mi bóveda
            </LinkButton>
            <Link href="/employer" className="self-center py-3 font-bold xl:self-start">
              Soy empleador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
