import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/app/_landing/site-nav';
import { PageHeader } from '@/components/ui/page-header';
import { OperatorConsole } from './operator-console';

export const metadata: Metadata = { title: 'Actuar como miembro · Constancia' };

export default function OperatorPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') notFound();
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-gutter py-12">
        <PageHeader
          title="Actuar como miembro"
          lead="Solo para la demostración: en producción, cada miembro firma desde su propio dispositivo."
        />
        <OperatorConsole />
      </main>
    </>
  );
}
