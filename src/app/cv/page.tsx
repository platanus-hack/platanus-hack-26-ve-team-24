import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { CvPortal } from './_components/cv-portal';

export default function CvPage() {
  return (
    <>
      <PageHeader
        title="Tu CV verificado"
        lead="Adjunta todas tus constancias. Cada una se comprueba contra el Registro y luego se une en un solo historial. Los archivos se leen en tu navegador y nunca se suben."
      />
      <div className="mt-10">
        <Suspense fallback={<p role="status">Abriendo…</p>}>
          <CvPortal />
        </Suspense>
      </div>
    </>
  );
}
