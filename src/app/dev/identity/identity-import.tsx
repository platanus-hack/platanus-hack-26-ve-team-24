'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { importStoredSigner } from '@/lib/credential/keystore';
import type { P256PrivateJwk } from '@/lib/credential/types';

interface NamedKey {
  name: string;
  jwk: P256PrivateJwk;
}
interface IdentityPack {
  members: NamedKey[];
  employers: NamedKey[];
}

type Outcome = { ok: true; count: number } | { ok: false };

async function importPack(pack: IdentityPack): Promise<number> {
  const entries = [
    ...pack.members.map(({ name, jwk }) => ({ key: `member:${name}`, jwk })),
    ...pack.employers.map(({ name, jwk }) => ({ key: `employer:${name}`, jwk })),
  ];
  await Promise.all(entries.map(({ key, jwk }) => importStoredSigner(key, jwk)));
  return entries.length;
}

async function fetchServerPack(): Promise<IdentityPack> {
  const response = await fetch('/api/dev/ledger/identities');
  if (!response.ok) throw new Error('identities unavailable');
  return (await response.json()) as IdentityPack;
}

export function IdentityImport() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // el servidor solo entrega estas claves con el registro en memoria; en modo cadena la ruta responde 404
  const fromServer = process.env.NEXT_PUBLIC_LEDGER_MODE === 'memory';

  async function run(load: () => Promise<IdentityPack>) {
    setOutcome(null);
    try {
      setOutcome({ ok: true, count: await importPack(await load()) });
    } catch {
      setOutcome({ ok: false });
    }
  }

  return (
    <div className="mt-12 flex flex-col gap-8">
      {fromServer ? (
        <Button
          className="self-start"
          onClick={() => {
            void run(fetchServerPack);
          }}
        >
          Importar desde este servidor
        </Button>
      ) : (
        <p className="max-w-[65ch] text-body text-ink-muted">
          Este despliegue usa el registro en vivo, así que las claves de demostración no se sirven
          desde aquí. Sube el archivo del paquete.
        </p>
      )}
      <Field label={`${fromServer ? 'O sube' : 'Sube'} demo-pack/identities.json`}>
        <input
          type="file"
          accept=".json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void run(async () => JSON.parse(await file.text()) as IdentityPack);
          }}
        />
      </Field>
      <p role="status" className={outcome?.ok === false ? 'font-bold text-fail' : 'font-bold'}>
        {outcome === null
          ? ''
          : outcome.ok
            ? `Se importaron ${outcome.count} identidades.`
            : 'No se pudo importar. Revisa el origen e inténtalo de nuevo.'}
      </p>
    </div>
  );
}
