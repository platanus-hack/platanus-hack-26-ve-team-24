import type { Metadata } from 'next';
import { SiteNav } from '@/app/_landing/site-nav';
import { PageHeader } from '@/components/ui/page-header';
import { LedgerView } from './_components/ledger-view';

export const metadata: Metadata = { title: 'Registro del consorcio · Constancia' };

export default function LedgerPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl px-gutter py-12">
        <PageHeader
          title="Registro del consorcio"
          lead="El registro público de quién puede emitir constancias y de las huellas de lo que emitió."
        />
        <LedgerView />
      </main>
    </>
  );
}
