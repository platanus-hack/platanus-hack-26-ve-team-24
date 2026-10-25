import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  lead,
  actions,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  // kicker is kept for contract compatibility but sits below the title: eyebrow labels above headings are banned
  return (
    <header className="border-b-4 border-ink pb-6">
      <h1 className="text-headline font-display text-balance">{title}</h1>
      {kicker && <p className="text-small text-ink-muted mt-4">{kicker}</p>}
      {lead && <p className="text-body text-ink-muted max-w-[65ch] mt-4">{lead}</p>}
      {actions && <div className="flex flex-wrap gap-4 mt-6">{actions}</div>}
    </header>
  );
}
