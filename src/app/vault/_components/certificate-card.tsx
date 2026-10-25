'use client';

import { Button, LinkButton } from '@/components/ui/button';
import { Seal } from '@/components/ui/seal';
import { certificateInfo, downloadText, KIND_LABEL } from '@/lib/vault/certificate-info';
import { useCertificateChecks } from '@/lib/vault/use-certificate-checks';
import { statusOf, type CertificateStatus } from '@/lib/vault/use-certificate-status';
import type { VaultCertificate } from '@/lib/vault/types';

const STATUS_TEXT: Record<CertificateStatus['state'], string> = {
  checking: 'Comprobando…',
  verified: 'Verificada en el Registro',
  revoked: 'Revocada o vencida',
  failed: 'Falló una comprobación',
  unavailable: 'El Registro no responde',
};

const STATUS_TONE: Record<CertificateStatus['state'], string> = {
  checking: 'text-ink',
  verified: 'text-ok',
  revoked: 'text-fail',
  failed: 'text-fail',
  unavailable: 'text-ink',
};

// el sello pequeño repite los cinco segmentos de la verificación en vivo
function CertificateStatusLine({ sdJwt }: { sdJwt: string }) {
  const { rows, verdict } = useCertificateChecks(sdJwt);
  const status: CertificateStatus = verdict ? statusOf(verdict) : { state: 'checking' };
  const reason = 'reason' in status ? status.reason : undefined;
  return (
    <div className={`flex items-center gap-4 ${STATUS_TONE[status.state]}`}>
      <Seal statuses={rows.map((row) => row.status)} size={48} />
      <p className="text-small font-bold tracking-wide uppercase">
        {STATUS_TEXT[status.state]}
        {reason ? (
          <span className="block font-normal tracking-normal text-ink-muted normal-case">{reason}</span>
        ) : null}
      </p>
    </div>
  );
}

export function CertificateCard({
  certificate,
  onDelete,
}: {
  certificate: VaultCertificate;
  onDelete: () => void;
}) {
  const { issuedOn } = certificateInfo(certificate);
  return (
    <li className="flex flex-col gap-5 border-t-2 border-ink py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a href={`/vault/c/${certificate.id}`} className="text-title font-bold no-underline hover:underline">
          {certificate.employerName}
        </a>
        <p className="text-small text-ink-muted">
          {KIND_LABEL[certificate.kind]}
          {issuedOn ? ` · emitida el ${issuedOn}` : ''}
        </p>
      </div>
      <CertificateStatusLine sdJwt={certificate.sdJwt} />
      <div className="flex flex-wrap gap-3">
        <LinkButton href={`/vault/c/${certificate.id}/share`}>Compartir</LinkButton>
        <Button
          variant="secondary"
          onClick={() => {
            downloadText(`${certificate.employerName}.sdjwt`, certificate.sdJwt);
          }}
        >
          Descargar
        </Button>
        <LinkButton variant="secondary" href={`/cv?add=${certificate.id}`}>
          Añadir a mi CV
        </LinkButton>
        <Button
          variant="quiet"
          onClick={() => {
            if (window.confirm('¿Borrar esta constancia de este dispositivo?')) onDelete();
          }}
        >
          Borrar
        </Button>
      </div>
    </li>
  );
}
