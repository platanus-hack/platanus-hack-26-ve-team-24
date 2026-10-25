'use client';

import { ErrorText } from '@/components/ui/error-text';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClaimList } from '@/components/ui/claim-list';
import { Disclosure } from '@/components/ui/disclosure';
import { loadSigner } from '@/lib/credential/keystore';
import { buildVerifiedCv } from '@/lib/credential/passport';
import { sealShare } from '@/lib/credential/share-crypto';
import type { ClaimName } from '@/lib/credential/types';
import {
  claimsOf,
  createCv,
  defaultReveal,
  previewTimeline,
  revealsName,
  type CvSelection,
} from '@/lib/vault/cv-builder';
import type { CvEntry } from '@/lib/vault/cv-entries';
import {
  appUrl,
  claimViews,
  EXPIRIES,
  TEMPLATE_LABELS,
  templateReveal,
  toggleClaim,
  type TemplateName,
} from '@/lib/vault/share-builder';
import { NoKeyError, type CreatedShare } from '@/lib/vault/share-flow';
import { postShare } from '@/lib/vault/shares-client';
import { AudienceAndExpiry, ShareResult } from '../../vault/_components/share-fields';
import { CvHistory } from './cv-history';

function EntryReveal({
  entry,
  reveal,
  onChange,
}: {
  entry: CvEntry;
  reveal: ClaimName[];
  onChange: (next: ClaimName[]) => void;
}) {
  const claims = claimsOf(entry);
  return (
    <Disclosure summary={`${entry.employer}${entry.jobTitle ? ` · ${entry.jobTitle}` : ''}`}>
      <div className="mb-4 flex flex-wrap gap-3">
        {(Object.keys(TEMPLATE_LABELS) as TemplateName[]).map((template) => (
          <Button
            key={template}
            variant="secondary"
            onClick={() => {
              onChange(templateReveal(template, claims));
            }}
          >
            {TEMPLATE_LABELS[template]}
          </Button>
        ))}
      </div>
      <ClaimList
        claims={claimViews(claims, reveal, 'toggle')}
        onToggle={(name, next) => {
          onChange(toggleClaim(reveal, name as ClaimName, next));
        }}
      />
    </Disclosure>
  );
}

export function CvBuilder({ included }: { included: CvEntry[] }) {
  const [reveals, setReveals] = useState<Record<string, ClaimName[]>>({});
  const [aud, setAud] = useState('');
  const [ttlSec, setTtlSec] = useState<number>(EXPIRIES[1].ttlSec);
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selections: CvSelection[] = included.map((entry) => ({
    entry,
    reveal: reveals[entry.id] ?? defaultReveal(entry),
  }));
  const preview = previewTimeline(selections);
  const canCreate = selections.length > 0 && aud.trim() !== '' && !busy;

  async function create() {
    setBusy(true);
    setFailure(null);
    try {
      setCreated(
        await createCv(
          { loadSigner, buildCv: buildVerifiedCv, seal: sealShare, postShare, appUrl: appUrl() },
          { selections, aud: aud.trim(), ttlSec },
        ),
      );
    } catch (caught) {
      setFailure(
        caught instanceof NoKeyError
          ? 'La clave de una de estas constancias no está en este dispositivo, así que el CV no se puede sellar aquí.'
          : 'No se pudo crear el enlace del CV. Revisa tu conexión e inténtalo de nuevo.',
      );
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="builder-title" className="grid gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <h2 id="builder-title" className="font-display text-headline font-extrabold">
          Crea tu CV verificado
        </h2>
        <div>
          <p className="mb-3 text-body">
            De entrada, cada empleo muestra la relación laboral y el cargo. Abre uno para cambiar lo
            que revela.
          </p>
          {selections.map(({ entry, reveal }) => (
            <EntryReveal
              key={entry.id}
              entry={entry}
              reveal={reveal}
              onChange={(next) => {
                setReveals((current) => ({ ...current, [entry.id]: next }));
              }}
            />
          ))}
        </div>
        {!revealsName(selections) && (
          <p role="status" className="border-2 border-ink bg-marigold p-4 font-bold">
            Muestra tu nombre en al menos un empleo; si no, quien lo reciba no sabrá de quién es este CV.
          </p>
        )}
        <AudienceAndExpiry aud={aud} onAud={setAud} ttlSec={ttlSec} onTtl={setTtlSec} />
      </div>

      <div className="flex flex-col gap-8">
        <section aria-labelledby="cv-preview-title" className="border-4 border-ink bg-paper p-6">
          <h2
            id="cv-preview-title"
            className="mb-6 font-display text-title font-extrabold"
          >
            Lo que ve quien lo recibe
          </h2>
          <CvHistory timeline={preview} />
        </section>
        <div className="flex flex-col gap-3">
          <div>
            <Button disabled={!canCreate} onClick={() => void create()}>
              {busy ? 'Creando…' : 'Crear CV verificado'}
            </Button>
          </div>
          {failure && (
            <ErrorText>{failure}</ErrorText>
          )}
        </div>
        {created && (
          <ShareResult
            title="Tu CV verificado está listo"
            link={created.link}
            file={{ name: 'history.cv.json', text: created.presentation }}
          />
        )}
      </div>
    </section>
  );
}
