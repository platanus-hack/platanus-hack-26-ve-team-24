import type { ComponentProps } from 'react';
import type { RecordedRequest } from '@/app/verify/_lib/types';
import { Receipt } from '@/components/ui/receipt';
import type { ClaimName, DisclosedClaims } from '@/lib/credential/types';
import { CLAIM_LABELS } from './verdict-panel';

type ReceiptRows = ComponentProps<typeof Receipt>['rows'];

// Receipt identifica las filas por etiqueta: con varias consultas, se numeran
function sentRows(requests: RecordedRequest[], shareId?: string): ReceiptRows {
  const rows: ReceiptRows = requests.flatMap((request, index) => {
    const suffix = requests.length > 1 ? ` ${index + 1}` : '';
    return [
      {
        label: `Consulta al registro${suffix}`,
        value: `${request.method} ${request.url} · ${request.bytes} bytes`,
      },
      { label: `Enviado${suffix}`, value: request.body, mono: true },
    ];
  });
  if (shareId) {
    rows.push({ label: 'Enlace para compartir', value: `GET /api/shares/${shareId} · un id, sin clave` });
  }
  return rows;
}

function deviceRows(claims: DisclosedClaims | null, shareId?: string): ReceiptRows {
  const disclosed = (Object.keys(claims ?? {}) as ClaimName[]).map((name) => CLAIM_LABELS[name]);
  const rows: ReceiptRows = [
    {
      label: 'Datos mostrados',
      value: `${disclosed.join(', ') || 'Ninguno'} · leídos aquí, nunca enviados`,
    },
  ];
  if (shareId) {
    rows.push({ label: 'Clave para descifrar', value: 'en el enlace, después del #, nunca enviada' });
  }
  rows.push({ label: 'Datos ocultos', value: 'ilegibles incluso para nosotros', muted: true });
  return rows;
}

export function ReceiptPanel({
  requests,
  shareId,
  claims,
}: {
  requests: RecordedRequest[];
  shareId?: string;
  claims: DisclosedClaims | null;
}) {
  return (
    <div className="grid gap-12 md:grid-cols-2">
      <Receipt
        title="Lo que salió de tu navegador"
        rows={sentRows(requests, shareId)}
        footnote="Solo se envían la cuenta del empleador, el id de su clave de firma y la huella de la constancia. Ningún nombre, ningún dato."
      />
      <Receipt title="Lo que se quedó en este dispositivo" rows={deviceRows(claims, shareId)} />
    </div>
  );
}
