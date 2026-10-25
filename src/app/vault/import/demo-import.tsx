'use client';

import { useState } from 'react';
import { DropZone } from '@/components/ui/drop-zone';
import { LinkButton } from '@/components/ui/button';
import { importDemoPack } from '@/lib/vault/demo-import';

export function DemoImport() {
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(file: File) {
    try {
      const count = await importDemoPack(await file.text());
      setMessage(`${count} ${count === 1 ? 'constancia importada' : 'constancias importadas'}.`);
    } catch {
      setMessage('Ese archivo no es un paquete de demostración.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DropZone label="Suelta vault.json aquí" accept=".json" onFile={(file) => void onFile(file)} />
      {message && <p role="status" className="font-bold">{message}</p>}
      <div>
        <LinkButton href="/vault">Abrir la bóveda</LinkButton>
      </div>
    </div>
  );
}
