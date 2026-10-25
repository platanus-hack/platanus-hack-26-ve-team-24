'use client';

import { LinkButton } from '@/components/ui/button';
import { Chip } from '@/components/ui/check-list';
import { Seal } from '@/components/ui/seal';
import { vaultStore } from '@/lib/vault/browser';
import { KIND_LABEL } from '@/lib/vault/certificate-info';
import { employerName, useEmployers } from '@/lib/vault/use-employers';
import { useVault } from '@/lib/vault/use-vault';
import type { VaultRequest } from '@/lib/vault/types';
import { CertificateCard } from './certificate-card';

function PendingRequest({
  request,
  employer,
  onDismiss,
}: {
  request: VaultRequest;
  employer: string;
  onDismiss: () => void;
}) {
  const closed = request.status === 'DECLINED' || request.status === 'REJECTED';
  const headline =
    request.status === 'DECLINED'
      ? `${employer} rechazó esta solicitud`
      : request.status === 'REJECTED'
        ? `${employer} envió una constancia que no se pudo usar`
        : `Esperando a ${employer}…`;
  return (
    <li className="grid grid-cols-[2.25rem_1fr] items-start gap-x-4 gap-y-3 border-t-2 border-ink py-4 sm:grid-cols-[2.25rem_1fr_auto]">
      <Chip status={closed ? 'FAILED' : 'CHECKING'} />
      <div>
        <p className="text-body font-bold">{headline}</p>
        <p className={`text-small font-bold tracking-wide uppercase ${closed ? 'text-fail' : 'text-ink'}`}>
          {closed ? 'Cerrada' : 'En espera'}
        </p>
        {request.error && <p className="text-small text-ink-muted">{request.error}</p>}
        <p className="text-small text-ink-muted">
          Empleado <code>{request.employeeRef}</code> · {KIND_LABEL[request.kind]}
        </p>
      </div>
      <div className="col-start-2 sm:col-start-3">
        {closed && (
          <button type="button" className="min-h-12 font-bold hover:underline" onClick={onDismiss}>
            Descartar
          </button>
        )}
      </div>
    </li>
  );
}

export function VaultHome() {
  const vault = useVault();
  const employers = useEmployers();

  if (vault.status === 'loading') return <p role="status">Abriendo tu bóveda…</p>;
  const { requests, certificates, refresh } = vault;

  return (
    <div className="flex flex-col gap-10">
      {requests.length > 0 && (
        <ul className="border-b-2 border-ink" aria-live="polite">
          {requests.map((request) => (
            <PendingRequest
              key={request.id}
              request={request}
              employer={employerName(employers, request.employer)}
              onDismiss={() => {
                void vaultStore().deleteRequest(request.id).then(refresh);
              }}
            />
          ))}
        </ul>
      )}
      {certificates.length > 0 && (
        <ul className="border-b-2 border-ink">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onDelete={() => {
                void vaultStore().deleteCertificate(certificate.id).then(refresh);
              }}
            />
          ))}
        </ul>
      )}
      {requests.length === 0 && certificates.length === 0 && (
        <section className="grid border-4 border-ink md:grid-cols-12">
          <div className="flex items-center justify-center bg-marigold p-8 md:col-span-4">
            <Seal size={128} />
          </div>
          <div className="flex flex-col gap-4 p-6 md:col-span-8 md:p-8">
            <h2 className="font-display text-title font-extrabold">Aún no tienes constancias</h2>
            <p className="max-w-[65ch] text-body">
              No hay cuenta, ni correo, ni registro. Pide una constancia a tu empleador y aparecerá
              aquí. Si pierdes este dispositivo, vuelves a pedir tus constancias.
            </p>
          </div>
        </section>
      )}
      <div>
        <LinkButton href="/vault/request">Pedir una constancia</LinkButton>
      </div>
    </div>
  );
}
