'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { RowStatus } from '@/components/ui/check-list';
import { Seal } from '@/components/ui/seal';

// si WebGL falta o el import falla, el sello aparece igual
const ENTRANCE_FALLBACK_MS = 3000;

const SealEntrance = dynamic(() => import('./seal-entrance'), { ssr: false });

type Phase = 'ssr' | 'entering' | 'done';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * La C del hero: entra en 3D una vez por carga y luego cede al sello DOM,
 * que es el que se cierra al soltar un PDF.
 */
export function SealStage({
  statuses,
  stagger,
  closing,
}: {
  statuses: readonly RowStatus[];
  stagger: number;
  closing: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('ssr');
  const [canvasMounted, setCanvasMounted] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase('done');
      return undefined;
    }
    setPhase('entering');
    setCanvasMounted(true);
    const fallback = setTimeout(() => {
      setPhase('done');
    }, ENTRANCE_FALLBACK_MS);
    return () => {
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (closing) setPhase('done');
  }, [closing]);

  const entering = phase === 'entering';

  return (
    <div className="flex flex-1 items-center justify-center">
      {/* el sello DOM da el tamaño; el canvas se superpone como hermano para no heredar su opacidad */}
      <div className="relative">
        <div
          className={
            entering ? 'opacity-0' : 'opacity-100 transition-opacity duration-[240ms] ease-resolve'
          }
        >
          <Seal statuses={statuses} stagger={stagger} size={320} className="hidden lg:grid" />
          <Seal statuses={statuses} stagger={stagger} size={176} className="lg:hidden" />
        </div>
        {canvasMounted ? (
          <div
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-[240ms] ease-resolve ${entering ? 'opacity-100' : 'opacity-0'}`}
            onTransitionEnd={() => {
              if (!entering) setCanvasMounted(false);
            }}
          >
            <SealEntrance
              onDone={() => {
                setPhase('done');
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
