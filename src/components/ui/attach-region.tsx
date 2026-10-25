import type { ReactNode } from 'react';
import { Seal } from '@/components/ui/seal';

/** Where a file is attached: the marigold seal column beside the drop slot. */
export function AttachRegion({ children }: { children: ReactNode }) {
  return (
    <section className="grid max-w-4xl border-4 border-ink md:grid-cols-12">
      <div className="flex items-center justify-center bg-marigold p-8 md:col-span-4">
        <Seal size={128} />
      </div>
      <div className="flex flex-col gap-4 p-6 md:col-span-8 md:p-8">{children}</div>
    </section>
  );
}
