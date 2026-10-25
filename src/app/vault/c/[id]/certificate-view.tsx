'use client';

import { useEffect, useState } from 'react';
import { CheckList, CheckRow } from '@/components/ui/check-list';
import { ClaimList } from '@/components/ui/claim-list';
import { Disclosure } from '@/components/ui/disclosure';
import { LinkButton } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Receipt } from '@/components/ui/receipt';
import { vaultStore } from '@/lib/vault/browser';
import { certificateInfo } from '@/lib/vault/certificate-info';
import { CHECK_LABELS, ownClaimViews } from '@/lib/vault/claims';
import type { VaultCertificate } from '@/lib/vault/types';
import { useCertificateChecks } from '@/lib/vault/use-certificate-checks';

type Loaded = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; certificate: VaultCertificate };

function Details({ certificate }: { certificate: VaultCertificate }) {
  const { decoded } = certificateInfo(certificate);
  const { rows, verdict } = useCertificateChecks(certificate.sdJwt);
  const anchor = verdict?.kind === 'AUTHENTIC' ? verdict.record : null;

  return (
    <div className="flex flex-col gap-10">
      <Panel title={`${certificate.employerName} · ${certificate.kind === 'CURRENT' ? 'Current' : 'Past'}`}>
        <ClaimList claims={ownClaimViews(decoded.claims)} />
      </Panel>
      <CheckList title="Checks">
        {rows.map((row, index) => (
          <CheckRow
            key={row.code}
            index={index + 1}
            label={CHECK_LABELS[row.code]}
            status={row.status}
            measured={row.measured}
            detail={row.code === 'HOLDER' && row.status === 'NOT_EXAMINED' ? 'Checked when you share it' : row.detail}
          />
        ))}
      </CheckList>
      <Disclosure summary="Technical details">
        <Receipt
          title="Credential and anchor"
          rows={[
            { label: 'Issuer', value: String(decoded.payload.issuer), mono: true },
            { label: 'Signing key (kid)', value: String(decoded.header.kid), mono: true },
            { label: 'Credential hash', value: certificate.credentialHash, mono: true },
            {
              label: 'Anchor',
              value: anchor ? `block ${anchor.blockNumber}` : 'Not read yet',
              mono: true,
            },
          ]}
        />
      </Disclosure>
      <div>
        <LinkButton href={`/vault/c/${certificate.id}/share`}>Share this certificate</LinkButton>
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

  if (loaded.status === 'loading') return <p role="status">Opening the certificate…</p>;
  if (loaded.status === 'missing') {
    return (
      <Panel title="Not in this vault">
        <p className="mb-4 text-body">This certificate is not on this device.</p>
        <LinkButton href="/vault">Back to your vault</LinkButton>
      </Panel>
    );
  }
  return <Details certificate={loaded.certificate} />;
}
