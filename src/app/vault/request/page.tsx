import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { RequestForm } from './request-form';

export const metadata: Metadata = { title: 'Pedir una constancia · Constancia' };

export default function RequestPage() {
  return (
    <>
      <PageHeader
        title="Pide una constancia"
        lead="Elige a tu empleador e indica tu número de empleado. Se crea una clave nueva en este dispositivo solo para esta solicitud."
      />
      <div className="mt-10 max-w-xl">
        <RequestForm />
      </div>
    </>
  );
}
