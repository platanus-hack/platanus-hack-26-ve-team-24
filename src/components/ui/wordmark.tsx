import Link from 'next/link';
import type { RowStatus } from './check-list';
import { Seal } from './seal';

const CLOSED: RowStatus[] = ['DONE', 'DONE', 'DONE', 'DONE', 'DONE'];

// el logotipo del programa: el sello cerrado junto al nombre espaciado
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 font-display text-body font-extrabold tracking-[0.32em] no-underline"
    >
      <Seal statuses={CLOSED} size={24} />
      CONSTANCIA
    </Link>
  );
}
