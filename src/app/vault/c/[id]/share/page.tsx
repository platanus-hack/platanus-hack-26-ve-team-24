import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ShareBuilder } from './share-builder-view';

// Route params are runtime data: they are read inside Suspense so the page shell can prerender.
async function ShareForId({ params }: { params: PageProps<'/vault/c/[id]/share'>['params'] }) {
  const { id } = await params;
  return <ShareBuilder id={id} />;
}

export default function SharePage({ params }: PageProps<'/vault/c/[id]/share'>) {
  return (
    <>
      <PageHeader
        title="Comparte un dato a la vez"
        lead="Elige qué puede ver quien la reciba. Lo que dejes fuera no se puede leer ni adivinar."
      />
      <div className="mt-10">
        <Suspense fallback={<p role="status">Abriendo la constancia…</p>}>
          <ShareForId params={params} />
        </Suspense>
      </div>
    </>
  );
}
