import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';

const LINKS = [
  { href: '/verify', label: 'Verificar' },
  { href: '/employer', label: 'Empleadores' },
  { href: '/vault', label: 'Bóveda' },
  { href: '/ledger', label: 'Registro' },
];

export function SiteNav() {
  return (
    <header className="flex flex-col gap-3 border-b-2 border-ink px-gutter py-4 md:flex-row md:items-center md:justify-between md:py-5">
      <Wordmark />
      <nav aria-label="Principal">
        <ul className="flex justify-between gap-x-4 md:gap-x-8">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-12 items-center text-small font-bold no-underline hover:underline md:text-body"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
