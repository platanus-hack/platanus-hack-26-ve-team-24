'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { Disclosure } from '@/components/ui/disclosure';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
import { Verdict as VerdictBand } from '@/components/ui/verdict';
import type { CareerTimeline, CvVerdict } from '@/lib/credential/passport';
import { useCvVerification } from '../_lib/use-cv-verification';
import type { LoadedInput, RowView } from '../_lib/types';
import { failureReason, statusesOf, unavailableReason, VERDICT_TITLE } from '../_lib/verdict-copy';
import { ReceiptPanel } from './receipt-panel';
import { SealLayout } from './seal-layout';
import { IssuerPanel, VerdictActions } from './verdict-panel';

type AuthenticCv = Extract<CvVerdict, { kind: 'AUTHENTIC' }>;

function reasonOf(verdict: CvVerdict): string | undefined {
  if (verdict.kind === 'AUTHENTIC') return undefined;
  if (verdict.kind === 'UNAVAILABLE') return unavailableReason(verdict.reason);
  const where = verdict.failedEntry === null ? '' : `Constancia ${verdict.failedEntry + 1}: `;
  return `${where}${failureReason(verdict.failedAt, verdict.reason)}`;
}

/** El sello muestra la constancia que falló o, si no, la última que se está comprobando. */
function activeEntry(entries: RowView[][], verdict: CvVerdict | null): RowView[] | undefined {
  if (verdict?.kind === 'NOT_AUTHENTIC' && verdict.failedEntry !== null) {
    return entries[verdict.failedEntry];
  }
  return entries.findLast((rows) => rows.some((row) => row.status !== 'PENDING')) ?? entries[0];
}

function timelineItems(timeline: CareerTimeline): TimelineItem[] {
  return timeline.items.map((item) => ({
    id: item.id,
    employer: item.employer,
    title: item.jobTitle,
    start: item.startDate,
    end: item.endDate ?? (item.employedNow ? 'actualidad' : undefined),
    status: 'VERIFIED',
    note: item.datesHidden ? 'Fechas ocultas' : undefined,
  }));
}

function Summary({ verdict }: { verdict: AuthenticCv }) {
  const employers = new Set(verdict.entries.map((entry) => entry.issuer.account)).size;
  const count = verdict.entries.length;
  return (
    <p className="text-title font-bold">
      {count} {count === 1 ? 'constancia' : 'constancias'} · {employers}{' '}
      {employers === 1 ? 'empleador' : 'empleadores'} · selladas juntas
    </p>
  );
}

export function CvView({ input, onReset }: { input: LoadedInput; onReset: () => void }) {
  const { entries, verdict, requests, running, run } = useCvVerification();
  const active = activeEntry(entries, verdict);

  useEffect(() => {
    void run(input);
  }, [input, run]);

  return (
    <>
      <SealLayout statuses={active ? statusesOf(active) : undefined}>
        <h1 className="font-display text-headline font-extrabold text-balance">CV verificado</h1>
        {verdict?.kind === 'AUTHENTIC' ? <Summary verdict={verdict} /> : null}
        <div className="border-b-2 border-ink">
          {entries.map((rows, index) => {
            const entry = verdict?.kind === 'AUTHENTIC' ? verdict.entries[index] : undefined;
            return (
              <Disclosure
                key={index}
                summary={`Constancia ${index + 1}${entry ? ` · ${entry.issuer.name}` : ''}`}
              >
                <CheckList>
                  {rows.map((row, rowIndex) => (
                    <CheckRow
                      key={row.code}
                      index={rowIndex + 1}
                      label={row.label}
                      status={row.status}
                      measured={row.measured}
                      detail={row.detail}
                    />
                  ))}
                </CheckList>
                {entry ? (
                  <div className="mt-6">
                    <IssuerPanel verdict={entry} />
                  </div>
                ) : null}
              </Disclosure>
            );
          })}
        </div>
      </SealLayout>
      <div className="flex flex-col gap-16 border-t-4 border-ink px-gutter py-16">
        {verdict ? (
          <VerdictBand
            kind={verdict.kind}
            title={VERDICT_TITLE[verdict.kind]}
            reason={reasonOf(verdict)}
            statuses={active ? statusesOf(active) : undefined}
          />
        ) : null}
        {verdict?.kind === 'AUTHENTIC' ? (
          <section>
            <h2 className="mb-6 font-display text-title font-extrabold">Trayectoria</h2>
            <Timeline
              items={timelineItems(verdict.timeline)}
              gaps={verdict.timeline.gaps}
              overlaps={verdict.timeline.overlaps}
            />
          </section>
        ) : null}
        {verdict ? (
          <VerdictActions
            checking={running}
            onCheckAgain={() => {
              void run(input);
            }}
          />
        ) : null}
        {verdict ? <ReceiptPanel requests={requests} shareId={input.shareId} claims={null} /> : null}
        <div>
          <Button variant="secondary" onClick={onReset}>
            Verificar otra constancia
          </Button>
        </div>
      </div>
    </>
  );
}
