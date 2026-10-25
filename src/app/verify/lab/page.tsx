import type { Metadata } from 'next';
import { SiteNav } from '@/app/_landing/site-nav';
import { LabView } from './lab-view';

export const metadata: Metadata = { title: 'Laboratorio de constancias falsas · Constancia' };

export default function LabPage() {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <header className="px-gutter pt-16 pb-12">
          <h1 className="max-w-[16ch] font-display text-display font-extrabold text-balance">
            Intenta falsificar una constancia.
          </h1>
          <p className="mt-8 max-w-[55ch] text-lead">
            Cada falsificación se verifica igual que una constancia real, y cada una falla en su
            propia comprobación.
          </p>
        </header>
        <LabView />
      </main>
    </>
  );
}
