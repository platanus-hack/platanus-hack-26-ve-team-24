const ROW_CLASS =
  'grid grid-cols-[minmax(7rem,12rem)_1fr] gap-x-6 gap-y-1 border-t-2 border-rule py-3 max-[480px]:grid-cols-1';

export function Receipt({
  title,
  rows,
  footnote,
}: {
  title: string;
  rows: { label: string; value: string; mono?: boolean; muted?: boolean }[];
  footnote?: string;
}) {
  return (
    <section className="border-t-4 border-ink pt-4">
      <h2 className="font-display font-extrabold text-title mb-4">{title}</h2>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            data-muted={row.muted ? 'true' : undefined}
            className={row.muted ? `${ROW_CLASS} text-ink-muted` : ROW_CLASS}
          >
            <dt className="text-small font-bold">{row.label}</dt>
            <dd className={row.mono ? 'text-body font-mono break-all' : 'text-body'}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {footnote ? <p className="text-small text-ink-muted mt-4 max-w-[65ch]">{footnote}</p> : null}
    </section>
  );
}
