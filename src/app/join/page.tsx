import type { Metadata } from 'next';
import { SiteNav } from '@/app/_landing/site-nav';
import { PageHeader } from '@/components/ui/page-header';
import { JoinView } from './join-view';

export const metadata: Metadata = { title: 'Unificar constancias · Constancia' };

export default function JoinPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-gutter pt-12 pb-24">
        <PageHeader
          title="Une tus constancias en un historial."
          lead="Carga los PDF que te dieron tus empleadores. Se comprueba que sean de la misma persona y que cada una sea auténtica, y se sellan juntas en un solo historial que nadie puede ampliar ni recortar."
        />
        <div className="mt-10">
          <JoinView />
        </div>
      </main>
    </>
  );
}
