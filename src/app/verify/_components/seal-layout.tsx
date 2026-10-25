import type { ReactNode } from 'react';
import type { RowStatus } from '@/components/ui/check-list';
import { Seal, SealLegend } from '@/components/ui/seal';

/** Región marigold con el sello (un segmento por comprobación, cambia en su sitio); el contenido va al lado. */
export function SealLayout({
  statuses,
  children,
}: {
  statuses?: readonly RowStatus[];
  children: ReactNode;
}) {
  return (
    <section className="grid md:grid-cols-12">
      <div className="flex flex-col justify-between gap-10 bg-marigold px-gutter py-10 text-ink md:sticky md:top-0 md:col-span-5 md:h-[calc(100svh-5.5rem)] md:self-start md:py-12">
        <div className="flex flex-1 items-center justify-center">
          <Seal statuses={statuses} size={256} className="hidden lg:grid" />
          <Seal statuses={statuses} size={144} className="lg:hidden" />
        </div>
        <SealLegend statuses={statuses} />
      </div>
      <div className="flex flex-col gap-10 px-gutter py-12 md:col-span-7 md:py-16 lg:px-16">
        {children}
      </div>
    </section>
  );
}
