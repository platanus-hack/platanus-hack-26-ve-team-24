'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClaimList } from '@/components/ui/claim-list';
import { DropZone } from '@/components/ui/drop-zone';
import { ErrorText } from '@/components/ui/error-text';
import { Field } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import { signerFromPrivateJwk } from '@/lib/credential/keys';
import { presentCredential } from '@/lib/credential/present';
import type { ClaimName } from '@/lib/credential/types';
import {
  CredentialFileError,
  readCredentialFile,
  type CredentialFile,
} from '@/lib/document/credential-file';
import { downloadPdf } from '@/lib/document/download';
import { presentationPdf } from '@/lib/document/documents';
import { setHandoffFile, takeHandoffFile } from '@/lib/handoff';
import {
  claimViews,
  EXPIRIES,
  MAX_AUDIENCE,
  revealsIdentity,
  TEMPLATE_LABELS,
  templateReveal,
  toggleClaim,
  type TemplateName,
} from '@/lib/vault/share-builder';

const TEMPLATES: TemplateName[] = ['employment', 'income', 'role', 'identity', 'full'];
const DEFAULT_TEMPLATE: TemplateName = 'employment';

interface Made {
  file: File;
  bytes: Uint8Array;
  shown: number;
  hidden: number;
}

export function PresentView() {
  const router = useRouter();
  const [credential, setCredential] = useState<CredentialFile | null>(null);
  const [reveal, setReveal] = useState<ClaimName[]>([]);
  const [aud, setAud] = useState('');
  const [ttlSec, setTtlSec] = useState<number>(EXPIRIES[1].ttlSec);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const started = useRef(false);

  async function load(file: File) {
    try {
      const loaded = await readCredentialFile(file);
      setCredential(loaded);
      setReveal(templateReveal(DEFAULT_TEMPLATE, loaded.claims));
      setMade(null);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof CredentialFileError ? caught.message : 'No se pudo leer el archivo.',
      );
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const handed = takeHandoffFile();
    if (handed) void load(handed);
  }, []);

  async function generate() {
    if (!credential || reveal.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const holder = await signerFromPrivateJwk(credential.holderKey);
      const audience = aud.trim() || 'Quien lo reciba';
      const presentation = await presentCredential({
        credential: credential.sdJwt,
        holder,
        reveal,
        aud: audience,
        ttlSec,
      });
      const bytes = await presentationPdf({ presentation, aud: audience });
      const file = new File([bytes as BlobPart], 'datos-compartidos.pdf', {
        type: 'application/pdf',
      });
      setMade({
        file,
        bytes,
        shown: reveal.length,
        hidden: Object.keys(credential.claims).length - reveal.length,
      });
      downloadPdf(file.name, bytes);
    } catch {
      setError('No se pudo generar la presentación. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (!credential) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <DropZone
          accept=".pdf"
          onFile={(file) => void load(file)}
          label="Suelta el PDF de tu constancia"
          hint="Es el archivo que te dio tu empleador. No sale de tu navegador."
        />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    );
  }

  const { claims } = credential;
  const hiddenCount = Object.keys(claims).length - reveal.length;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <Panel title="1. Elige qué mostrar">
          <div className="mb-6 flex flex-wrap gap-2">
            {TEMPLATES.map((name) => (
              <Button
                key={name}
                variant="secondary"
                onClick={() => {
                  setReveal(templateReveal(name, claims));
                  setMade(null);
                }}
              >
                {TEMPLATE_LABELS[name]}
              </Button>
            ))}
          </div>
          <ClaimList
            claims={claimViews(claims, reveal, 'toggle')}
            onToggle={(name, next) => {
              setReveal((current) => toggleClaim(current, name as ClaimName, next));
              setMade(null);
            }}
          />
          {revealsIdentity(reveal) && (
            <p role="status" className="mt-4 font-bold">
              Vas a mostrar tu cédula. Quien la reciba podrá ligar esta constancia contigo.
            </p>
          )}
        </Panel>
        <Panel title="2. ¿Para quién y por cuánto tiempo?">
          <div className="flex flex-col gap-6">
            <Field
              label="¿Para quién es?"
              hint="Un nombre que verá quien lo reciba, por ejemplo Banco Meridiano."
            >
              <input
                value={aud}
                maxLength={MAX_AUDIENCE}
                autoComplete="off"
                onChange={(event) => {
                  setAud(event.target.value);
                  setMade(null);
                }}
              />
            </Field>
            <Field label="La presentación vale durante">
              <select
                value={ttlSec}
                onChange={(event) => {
                  setTtlSec(Number(event.target.value));
                  setMade(null);
                }}
              >
                {EXPIRIES.map((option) => (
                  <option key={option.ttlSec} value={option.ttlSec}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-8">
        <Panel title="Lo que verá quien la reciba">
          <ClaimList
            claims={claimViews(claims, reveal, 'preview')}
            caption={
              hiddenCount === 0
                ? 'No se oculta nada'
                : `${hiddenCount} ${hiddenCount === 1 ? 'dato queda oculto' : 'datos quedan ocultos'}: no viajan en el archivo`
            }
          />
        </Panel>
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy || reveal.length === 0} onClick={() => void generate()}>
            {busy ? 'Generando…' : 'Generar el PDF de la presentación'}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              setCredential(null);
              setMade(null);
            }}
          >
            Usar otra constancia
          </Button>
        </div>
        {reveal.length === 0 && (
          <p className="text-small text-ink-muted">Elige al menos un dato.</p>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        {made && (
          <Panel title="Presentación lista">
            <p className="mb-6 max-w-[65ch] text-body">
              Se descargó con {made.shown} {made.shown === 1 ? 'dato' : 'datos'}; {made.hidden}{' '}
              {made.hidden === 1 ? 'quedó oculto' : 'quedaron ocultos'}. Quien reciba este PDF lo
              carga en Verificar y comprueba lo que mostraste, sin ver el resto.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setHandoffFile(made.file);
                  router.push('/verify');
                }}
              >
                Verificarla ahora
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  downloadPdf(made.file.name, made.bytes);
                }}
              >
                Descargar de nuevo
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
