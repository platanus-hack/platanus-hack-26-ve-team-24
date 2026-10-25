import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/ui/wordmark';

const LINKS = [
  { href: '/present', label: 'Compartir' },
  { href: '/join', label: 'Unificar' },
  { href: '/verify', label: 'Verificar' },
] as const;

/** Shared frame of the holder's pages: /present and /join. */
export function HolderShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="grid border-b-2 border-ink md:grid-cols-12">
        <div className="flex items-center bg-marigold px-gutter py-5 md:col-span-5">
          <Wordmark />
        </div>
        <nav aria-label="Titular" className="flex items-center px-gutter py-2 md:col-span-7">
          <ul className="flex flex-wrap gap-x-8 gap-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-12 items-center font-bold no-underline hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-gutter pt-12 pb-24">{children}</main>
    </>
  );
}
