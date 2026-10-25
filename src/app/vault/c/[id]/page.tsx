import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { CertificateView } from './certificate-view';

// Route params are runtime data: they are read inside Suspense so the page shell can prerender.
async function CertificateForId({ params }: { params: PageProps<'/vault/c/[id]'>['params'] }) {
  const { id } = await params;
  return <CertificateView id={id} />;
}

export default function CertificatePage({ params }: PageProps<'/vault/c/[id]'>) {
  return (
    <>
      <PageHeader
        title="Tu constancia"
        lead="Tú ves todos sus datos. Quien la reciba ve solo lo que tú elijas."
      />
      <div className="mt-10">
        <Suspense fallback={<p role="status">Abriendo la constancia…</p>}>
          <CertificateForId params={params} />
        </Suspense>
      </div>
    </>
  );
}
