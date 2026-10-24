import { useI18n } from "../i18n";

const STEPS = ["chain", "sequence", "anchor"] as const;

/** Antes de comprobar, la línea enseña qué se comprueba: tres estaciones. */
export function EmptyState() {
  const { t } = useI18n();

  return (
    <section aria-labelledby="empty-title" className="space-y-6">
      <div>
        <h1
          id="empty-title"
          className="font-display text-5xl leading-[0.95] font-bold tracking-wide uppercase"
        >
          {t.empty.title}
        </h1>
        <p className="mt-3 max-w-[52ch] text-base leading-snug text-chalk">{t.empty.body}</p>
      </div>
      <ol className="rail">
        {STEPS.map((step, index) => (
          <li key={step} className="relative py-2 pl-12">
            <span
              className="rail-seg"
              data-start={index === 0}
              data-end={index === STEPS.length - 1}
            />
            <span
              aria-hidden
              className="absolute top-3.5 left-2 size-6 rounded-full border-[5px] border-porcelain bg-enamel"
            />
            <p className="min-h-11 py-1.5 text-lg">{t.checks[step]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
