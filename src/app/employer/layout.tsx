import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';
import type { Metadata } from 'next';
import { EmployerNav } from './_components/employer-nav';

export const metadata: Metadata = { title: 'Empleador · Constancia' };

export default function EmployerLayout({ children }: LayoutProps<'/employer'>) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b-2 border-ink px-gutter py-5">
        <p className="flex flex-wrap items-baseline gap-x-4">
          <Wordmark />
          <Link href="/employer" className="font-bold no-underline hover:underline">
            Empleador
          </Link>
        </p>
        <EmployerNav />
      </header>
      <main className="mx-auto w-full max-w-6xl px-gutter pt-12 pb-24">{children}</main>
    </>
  );
}
