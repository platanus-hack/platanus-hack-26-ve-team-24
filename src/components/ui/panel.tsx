import type { ReactNode } from 'react';

const TONE = {
  default: 'border-2 border-ink bg-paper p-6',
  quiet: 'border-2 border-rule bg-transparent p-6',
} as const;

export function Panel({
  title,
  children,
  tone = 'default',
}: {
  title?: string;
  children: ReactNode;
  tone?: 'default' | 'quiet';
}) {
  return (
    <section data-tone={tone} className={TONE[tone]}>
      {title && (
        <h2 className="mb-4 font-display text-title font-extrabold">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
