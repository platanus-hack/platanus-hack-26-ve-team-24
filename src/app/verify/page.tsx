import type { Metadata } from 'next';
import { SiteNav } from '@/app/_landing/site-nav';
import { VerifyView } from './_components/verify-view';

export const metadata: Metadata = { title: 'Verificar una constancia · Constancia' };

export default function VerifyPage() {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 flex-col">
        <VerifyView />
      </main>
    </>
  );
}
