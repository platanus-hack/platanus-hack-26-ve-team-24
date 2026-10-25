import type { Metadata } from 'next';
import { SiteNav } from '@/app/_landing/site-nav';
import { PageHeader } from '@/components/ui/page-header';
import { PresentView } from './present-view';

export const metadata: Metadata = { title: 'Compartir solo una parte · Constancia' };

export default function PresentPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-gutter pt-12 pb-24">
        <PageHeader
          title="Comparte solo lo que elijas."
          lead="Carga el PDF de tu constancia, marca los datos que quieres mostrar y genera una presentación. Lo que no marques no viaja en el archivo, ni cifrado, y aun así quien lo reciba puede comprobar que lo firmó tu empleador."
        />
        <div className="mt-10">
          <PresentView />
        </div>
      </main>
    </>
  );
}
