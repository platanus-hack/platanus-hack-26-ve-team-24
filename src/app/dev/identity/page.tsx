import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { IdentityImport } from './identity-import';

export const metadata: Metadata = { title: 'Identidades de demostración · Constancia' };

export default function DevIdentityPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-12">
      <PageHeader
        title="Identidades de demostración"
        lead="Herramienta de desarrollo: importa en este navegador los miembros y empleadores ficticios de la demo, como claves que no se pueden volver a exportar."
      />
      <IdentityImport />
    </main>
  );
}
