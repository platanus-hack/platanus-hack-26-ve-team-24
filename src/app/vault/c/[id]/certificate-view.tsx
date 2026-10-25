'use client';

import { useEffect, useState } from 'react';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { ClaimList } from '@/components/ui/claim-list';
import { Disclosure } from '@/components/ui/disclosure';
import { LinkButton } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Receipt } from '@/components/ui/receipt';
import { Seal, SealLegend } from '@/components/ui/seal';
import { vaultStore } from '@/lib/vault/browser';
import { certificateInfo, KIND_LABEL } from '@/lib/vault/certificate-info';
import { CHECK_LABELS, ownClaimViews } from '@/lib/vault/claims';
import type { VaultCertificate } from '@/lib/vault/types';
import { useCertificateChecks } from '@/lib/vault/use-certificate-checks';
import { NotInVault } from '../../_components/not-in-vault';

type Loaded = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; certificate: VaultCertificate };

function Details({ certificate }: { certificate: VaultCertificate }) {
  const { decoded } = certificateInfo(certificate);
  const { rows, verdict } = useCertificateChecks(certificate.sdJwt);
  const anchor = verdict?.kind === 'AUTHENTIC' ? verdict.record : null;
  const statuses = rows.map((row) => row.status);

  return (
    <div className="flex flex-col gap-12">
      <Panel title={`${certificate.employerName} · ${KIND_LABEL[certificate.kind]}`}>
        <ClaimList claims={ownClaimViews(decoded.claims)} />
      </Panel>
      <section aria-labelledby="checks-title" className="grid border-4 border-ink lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-8 bg-marigold p-6 lg:col-span-4">
          <div className="flex justify-center">
            <Seal statuses={statuses} size={160} />
          </div>
          <SealLegend statuses={statuses} />
        </div>
        <div className="p-6 lg:col-span-8">
          <h2 id="checks-title" className="sr-only">
            Comprobaciones
          </h2>
          <CheckList>
            {rows.map((row, index) => (
              <CheckRow
                key={row.code}
                index={index + 1}
                label={CHECK_LABELS[row.code]}
                status={row.status}
                measured={row.measured}
                detail={
                  row.code === 'HOLDER' && row.status === 'NOT_EXAMINED'
                    ? 'Se comprueba cuando la compartes'
                    : row.detail
                }
              />
            ))}
          </CheckList>
        </div>
      </section>
      <Disclosure summary="Detalles técnicos">
        <Receipt
          title="Credencial y anclaje"
          rows={[
            { label: 'Emisor', value: String(decoded.payload.issuer), mono: true },
            { label: 'Clave de firma (kid)', value: String(decoded.header.kid), mono: true },
            { label: 'Hash de la credencial', value: certificate.credentialHash, mono: true },
            {
              label: 'Anclaje',
              value: anchor ? `bloque ${anchor.blockNumber}` : 'Aún sin leer',
              mono: true,
            },
          ]}
        />
      </Disclosure>
      <div>
        <LinkButton href={`/vault/c/${certificate.id}/share`}>Compartir esta constancia</LinkButton>
      </div>
    </div>
  );
}

export function CertificateView({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });

  useEffect(() => {
    void (async () => {
      const certificate = await vaultStore().getCertificate(id);
      setLoaded(certificate ? { status: 'ready', certificate } : { status: 'missing' });
    })();
  }, [id]);

  if (loaded.status === 'loading') return <p role="status">Abriendo la constancia…</p>;
  if (loaded.status === 'missing') return <NotInVault />;
  return <Details certificate={loaded.certificate} />;
}
