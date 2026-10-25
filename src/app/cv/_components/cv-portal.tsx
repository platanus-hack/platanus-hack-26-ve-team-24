'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/check-list';
import { DropZone } from '@/components/ui/drop-zone';
import { LineField } from '@/components/ui/line-field';
import { Panel } from '@/components/ui/panel';
import { Timeline } from '@/components/ui/timeline';
import { vaultStore } from '@/lib/vault/browser';
import { canJoin, ENTRY_ROW_STATUS, entryNote, timelineItems, timelineOf, type CvEntry } from '@/lib/vault/cv-entries';
import { useCvEntries } from '@/lib/vault/use-cv-entries';
import type { VaultCertificate } from '@/lib/vault/types';
import { CvBuilder } from './cv-builder-view';

const STATUS_WORD = {
  VERIFIED: 'Verified',
  FAILED: 'Failed',
  UNAVAILABLE: 'Unavailable',
  UNBOUND: 'Not yours to join',
} as const;

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
    <li className="grid grid-cols-[2.25rem_1fr_auto] items-start gap-x-4 border-t-2 border-ink py-4">
      <Chip status={ENTRY_ROW_STATUS[entry.status]} />
      <div>
        <p className="text-title font-bold">{entry.employer}</p>
        <p className="text-body">
          {[entry.jobTitle, [entry.startDate, entry.endDate ?? (entry.employedNow ? 'present' : undefined)].filter(Boolean).join(' – ')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="text-small font-bold uppercase tracking-wide">{STATUS_WORD[entry.status]}</p>
        {note && <p className="max-w-[65ch] text-small text-ink-muted">{note}</p>}
      </div>
      {canJoin(entry) && (
        <label className="flex min-h-12 items-center gap-2 font-bold">
          <input
            type="checkbox"
            className="size-5 accent-ink"
            checked={included}
            onChange={(event) => {
              onToggle(event.target.checked);
            }}
          />
          In my CV
        </label>
      )}
    </li>
  );
}

function VaultPicker({ certificates, onPick }: { certificates: VaultCertificate[]; onPick: (certificate: VaultCertificate) => void }) {
  if (certificates.length === 0) {
    return <p className="text-body text-ink-muted">Your vault has no certificates yet.</p>;
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
            {certificate.employerName} · {certificate.kind === 'CURRENT' ? 'Current' : 'Past'}
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
        void add(requested.sdJwt, requested.keyName);
      }
    })();
  }, [addParam, add]);

  const timeline = timelineOf(cv.included);

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="attach-title" className="flex flex-col gap-6">
        <h2 id="attach-title" className="font-display text-title font-extrabold font-stretch-expanded">
          Attach your certificates
        </h2>
        <LineField>
          <DropZone
            multiple
            accept=".sdjwt,.txt"
            label="Drop .sdjwt files here"
            hint="Read in this browser. Nothing is uploaded."
            disabled={cv.busy}
            onFiles={(files) => void cv.attachFiles(files)}
          />
        </LineField>
        <div>
          <h3 className="mb-3 font-bold text-small">Pick from your vault</h3>
          <VaultPicker
            certificates={vaultCertificates}
            onPick={(certificate) => void cv.add(certificate.sdJwt, certificate.keyName)}
          />
        </div>
      </section>

      {cv.entries.length > 0 && (
        <section aria-labelledby="entries-title">
          <h2 id="entries-title" className="mb-4 font-display text-title font-extrabold font-stretch-expanded">
            Attached
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
        <Panel title="Your history">
          <Timeline items={timelineItems(timeline)} gaps={timeline.gaps} overlaps={timeline.overlaps} />
        </Panel>
      )}

      {cv.included.length > 0 && <CvBuilder included={cv.included} />}
    </div>
  );
}
