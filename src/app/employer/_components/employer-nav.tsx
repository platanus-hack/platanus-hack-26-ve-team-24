'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/employer/session-client';
import { useMe } from '@/lib/employer/use-me';

const LINKS = [
  { href: '/employer', label: 'Emitir' },
  { href: '/employer/issued', label: 'Emitidas' },
];

export function EmployerNav() {
  const view = useMe();
  const pathname = usePathname();
  if (view.status !== 'in') return null;

  return (
    <nav aria-label="Empleador" className="flex flex-wrap items-center gap-x-8 gap-y-1">
      <ul className="flex flex-wrap gap-x-8 gap-y-1">
        {LINKS.map((link) => {
          const current =
            link.href === '/employer' ? pathname === '/employer' : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-12 items-center border-b-4 font-bold no-underline ${current ? 'border-ink' : 'border-transparent hover:border-ink'}`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <span className="text-small text-ink-muted">{view.me.name || 'Tu organización'}</span>
      <Button
        variant="quiet"
        onClick={() => {
          void signOut();
        }}
      >
        Cerrar sesión
      </Button>
    </nav>
  );
}
