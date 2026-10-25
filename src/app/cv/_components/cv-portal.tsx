'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/check-list';
import { DropZone } from '@/components/ui/drop-zone';
import { Panel } from '@/components/ui/panel';
import { vaultStore } from '@/lib/vault/browser';
import { KIND_LABEL } from '@/lib/vault/certificate-info';
import { canJoin, ENTRY_ROW_STATUS, entryNote, PRESENT, timelineOf, type CvEntry, type EntryStatus } from '@/lib/vault/cv-entries';
import { useCvEntries } from '@/lib/vault/use-cv-entries';
import type { VaultCertificate } from '@/lib/vault/types';
import { CvBuilder } from './cv-builder-view';
import { CvHistory } from './cv-history';

const STATUS_WORD: Record<EntryStatus, string> = {
  VERIFIED: 'Verificada',
  FAILED: 'Falló',
  UNAVAILABLE: 'No disponible',
  UNBOUND: 'De otra bóveda',
};

const STATUS_TONE: Record<EntryStatus, string> = {
  VERIFIED: 'text-ok',
  FAILED: 'text-fail',
  UNAVAILABLE: 'text-ink',
  UNBOUND: 'text-fail',
};

const SECTION_TITLE = 'font-display text-title font-extrabold';

function entryDates(entry: CvEntry): string {
  const end = entry.endDate ?? (entry.employedNow ? PRESENT : undefined);
  return [entry.startDate, end].filter(Boolean).join(' – ');
}

function EntryRow({
  entry,
  included,
  onToggle,
}: {
  entry: CvEntry;
  included: boolean;
  onToggle: (next: boolean) => void;
}) {
  const note = entryNote(entry);
  return (
    <li className="grid grid-cols-[2.25rem_1fr] items-start gap-x-4 gap-y-3 border-t-2 border-ink py-4 sm:grid-cols-[2.25rem_1fr_auto]">
      <Chip status={ENTRY_ROW_STATUS[entry.status]} />
      <div>
        <p className="text-title font-bold">{entry.employer}</p>
        <p className="text-body">{[entry.jobTitle, entryDates(entry)].filter(Boolean).join(' · ')}</p>
        <p className={`text-small font-bold tracking-wide uppercase ${STATUS_TONE[entry.status]}`}>
          {STATUS_WORD[entry.status]}
        </p>
        {note && <p className="max-w-[65ch] text-small text-ink-muted">{note}</p>}
      </div>
      {canJoin(entry) && (
        <label className="col-start-2 flex min-h-12 items-center gap-3 font-bold sm:col-start-3">
          <input
            type="checkbox"
            className="size-5 accent-ink"
            checked={included}
            onChange={(event) => {
              onToggle(event.target.checked);
            }}
          />
          En mi CV
        </label>
      )}
    </li>
  );
}

function VaultPicker({ certificates, onPick }: { certificates: VaultCertificate[]; onPick: (certificate: VaultCertificate) => void }) {
  if (certificates.length === 0) {
    return <p className="text-body">Tu bóveda aún no tiene constancias.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-3">
      {certificates.map((certificate) => (
        <li key={certificate.id}>
          <Button
            variant="secondary"
            onClick={() => {
              onPick(certificate);
            }}
          >
            {certificate.employerName} · {KIND_LABEL[certificate.kind]}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function CvPortal() {
  const cv = useCvEntries();
  const [vaultCertificates, setVaultCertificates] = useState<VaultCertificate[]>([]);
  const addParam = useSearchParams().get('add');
  const handledParam = useRef(false);
  const { add } = cv;

  useEffect(() => {
    void (async () => {
      const certificates = await vaultStore().listCertificates();
      setVaultCertificates(certificates);
      const requested = certificates.find((certificate) => certificate.id === addParam);
      if (requested && !handledParam.current) {
        handledParam.current = true;
        await add(requested.sdJwt, requested.keyName);
      }
    })();
  }, [addParam, add]);

  const timeline = timelineOf(cv.included);

  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="attach-title" className="grid border-4 border-ink lg:grid-cols-12">
        <div className="flex flex-col gap-6 bg-marigold p-6 lg:col-span-7">
          <h2 id="attach-title" className={SECTION_TITLE}>
            Adjunta tus constancias
          </h2>
          <DropZone
            multiple
            accept=".sdjwt,.txt"
            label="Suelta aquí tus archivos .sdjwt"
            hint="Se leen en este navegador. No se sube nada."
            disabled={cv.busy}
            onFiles={(files) => void cv.attachFiles(files)}
          />
        </div>
        <div className="flex flex-col gap-4 p-6 lg:col-span-5">
          <h3 className="font-bold">O elige de tu bóveda</h3>
          <VaultPicker
            certificates={vaultCertificates}
            onPick={(certificate) => void cv.add(certificate.sdJwt, certificate.keyName)}
          />
        </div>
      </section>

      {cv.entries.length > 0 && (
        <section aria-labelledby="entries-title">
          <h2 id="entries-title" className={`mb-4 ${SECTION_TITLE}`}>
            Adjuntas
          </h2>
          <ul className="border-b-2 border-ink" aria-live="polite">
            {cv.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                included={cv.included.some((kept) => kept.id === entry.id)}
                onToggle={(next) => {
                  cv.toggleIncluded(entry.id, next);
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {timeline.items.length > 0 && (
        <Panel title="Tu historial">
          <CvHistory timeline={timeline} />
        </Panel>
      )}

      {cv.included.length > 0 && <CvBuilder included={cv.included} />}
    </div>
  );
}
