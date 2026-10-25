import { Disclosure } from '@/components/ui/disclosure';
import { Receipt } from '@/components/ui/receipt';
import type { DecodedPresentation } from '@/lib/credential/present';
import type { Verdict } from '@/lib/credential/verify';

type AuthenticVerdict = Extract<Verdict, { kind: 'AUTHENTIC' }>;

function digestsOf(payload: DecodedPresentation['payload']): string[] {
  const digests = (payload.credentialSubject as { _sd?: unknown } | undefined)?._sd;
  return Array.isArray(digests) ? digests.map(String) : [];
}

export function TechnicalDetails({
  verdict,
  decoded,
}: {
  verdict: AuthenticVerdict;
  decoded: DecodedPresentation;
}) {
  const { record, issuer } = verdict;
  const anchoredAt = new Date(record.anchoredAt * 1000).toISOString();
  return (
    <Disclosure summary="Detalles técnicos">
      <Receipt
        title="Credencial y anclaje"
        rows={[
          { label: 'Encabezado', value: JSON.stringify(decoded.header), mono: true },
          { label: 'Emisor', value: issuer.did, mono: true },
          { label: 'Clave de firma (kid)', value: String(decoded.header.kid), mono: true },
          { label: 'Huella de la credencial', value: record.credentialHash, mono: true },
          {
            label: 'Anclada',
            value: `bloque ${record.blockNumber} · ${anchoredAt}`,
            mono: true,
          },
          { label: 'Resúmenes de los datos', value: digestsOf(decoded.payload).join(' '), mono: true },
          {
            label: 'Estándares',
            value: 'W3C Verifiable Credentials 2.0 · SD-JWT · ES256 · did:constancia',
            mono: true,
          },
        ]}
      />
      <p className="mt-4 max-w-[65ch] text-body text-ink-muted">
        Divulgación selectiva, no conocimiento cero: los datos ocultos son hashes con sal. El
        registro prueba quién la emitió y cuándo, no que lo que dice sea verdad.
      </p>
    </Disclosure>
  );
}
