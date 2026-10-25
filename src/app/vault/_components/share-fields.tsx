'use client';

import { focusOnMount } from './focus';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Panel } from '@/components/ui/panel';
import { QrBlock } from '@/components/ui/qr-block';
import { downloadText } from '@/lib/vault/certificate-info';
import { EXPIRIES, MAX_AUDIENCE } from '@/lib/vault/share-builder';

/** Who the share is for and how long the link works: the same two questions for a share and a CV. */
export function AudienceAndExpiry({
  aud,
  onAud,
  ttlSec,
  onTtl,
}: {
  aud: string;
  onAud: (next: string) => void;
  ttlSec: number;
  onTtl: (next: number) => void;
}) {
  return (
    <>
      <Field label="¿Para quién es?" hint="Un nombre que verá quien lo reciba, por ejemplo Banco Demo.">
        <input
          value={aud}
          maxLength={MAX_AUDIENCE}
          autoComplete="off"
          onChange={(event) => {
            onAud(event.target.value);
          }}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">El enlace funciona durante</legend>
        {EXPIRIES.map((option) => (
          <label key={option.ttlSec} className="flex min-h-12 items-center gap-3 text-body">
            <input
              type="radio"
              name="expiry"
              className="size-5 accent-ink"
              checked={ttlSec === option.ttlSec}
              onChange={() => {
                onTtl(option.ttlSec);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </>
  );
}

/** The finished link as a QR with Copy, plus the file download. Takes focus when it appears. */
export function ShareResult({
  title,
  link,
  file,
}: {
  title: string;
  link: string;
  file: { name: string; text: string };
}) {
  return (
    <div ref={focusOnMount} tabIndex={-1} className="outline-none">
      <Panel title={title}>
        <QrBlock value={link} label="Enlace para compartir" copy />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              downloadText(file.name, file.text);
            }}
          >
            Descargar como archivo
          </Button>
        </div>
        <p className="mt-4 text-small text-ink-muted">
          La llave para abrirlo va dentro del enlace y nunca llega a nuestro servidor.
        </p>
      </Panel>
    </div>
  );
}
