'use client';

import { useEffect, useState } from 'react';
import type { RowStatus } from './check-list';
import { Seal } from './seal';

type Kind = 'AUTHENTIC' | 'NOT_AUTHENTIC' | 'UNAVAILABLE';

const FIELD: Record<Kind, string> = {
  AUTHENTIC: 'bg-ok text-paper',
  NOT_AUTHENTIC: 'bg-fail text-paper',
  UNAVAILABLE: 'bg-marigold text-ink',
};

const ALL_VERIFIED: RowStatus[] = ['VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED'];

/**
 * A resolved field with the closed (or broken) seal and a huge word. The colour wipes in once:
 * the page's one motion. `statuses` draws the seal per check; by default an authentic verdict is closed.
 */
export function Verdict({
  kind,
  title,
  reason,
  issuerDomain,
  statuses,
}: {
  kind: Kind;
  title: string;
  reason?: string;
  issuerDomain?: string;
  statuses?: readonly RowStatus[];
}) {
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setResolved(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section data-kind={kind} className="relative border-4 border-ink bg-paper">
      {/* announced once resolved: a live region mounted together with its text is often skipped */}
      <p role="status" className="sr-only">
        {resolved ? `${title}. ${reason ?? ''}` : ''}
      </p>
      <div
        data-resolved={resolved}
        className={`verdict-field flex min-h-56 flex-wrap items-center gap-x-10 gap-y-6 px-gutter py-10 ${FIELD[kind]}`}
      >
        <Seal statuses={statuses ?? (kind === 'AUTHENTIC' ? ALL_VERIFIED : undefined)} size={112} />
        <h2 className="font-display text-headline font-extrabold text-balance sm:text-display">
          {title}
        </h2>
      </div>
      {reason || issuerDomain ? (
        <div className="flex flex-col gap-3 border-t-4 border-ink p-6">
          {reason ? <p className="max-w-[65ch] text-body">{reason}</p> : null}
          {issuerDomain ? (
            <p className="text-small">
              <span className="font-bold">Emisor</span> <code>{issuerDomain}</code>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
