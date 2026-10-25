import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { IssueFlow } from './issue-flow';

// Los params de la ruta son datos de ejecución: se leen dentro de Suspense para que el resto se prerenderice.
async function IssueForRequest({ params }: { params: PageProps<'/employer/issue/[id]'>['params'] }) {
  const { id } = await params;
  return <IssueFlow requestId={id} />;
}

export default function IssuePage({ params }: PageProps<'/employer/issue/[id]'>) {
  return (
    <>
      <PageHeader
        title="Emitir una constancia"
        lead="Revisa los datos y emite. Cada paso muestra lo que hizo."
      />
      <div className="mt-10">
        <Suspense fallback={<p role="status">Abriendo la solicitud…</p>}>
          <IssueForRequest params={params} />
        </Suspense>
      </div>
    </>
  );
}
