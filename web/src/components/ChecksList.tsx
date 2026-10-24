import { Check as CheckIcon, Minus, X } from "lucide-react";
import type { Analysis, Check, CheckStatus } from "../features/verify/types";
import { useI18n } from "../i18n";

const STATUS_TONE: Record<CheckStatus, string> = {
  pass: "text-green-text",
  fail: "text-scarlet-text",
  unavailable: "text-chalk",
};

const STATUS_ICON = { pass: CheckIcon, fail: X, unavailable: Minus } as const;

/** En móvil son cuatro celdas compactas bajo el veredicto; en escritorio, una lista. */
export function ChecksList({ analysis }: { analysis: Analysis }) {
  const { t } = useI18n();

  const detail = (check: Check): string | null =>
    check.id === "sequence" && check.expected !== null && check.found !== null
      ? t.checks.sequenceValue(Number(check.found), Number(check.expected))
      : null;

  return (
    <section aria-labelledby="checks-title">
      <h2
        id="checks-title"
        className="sr-only font-display text-xl font-semibold tracking-wide lg:not-sr-only"
      >
        {t.checks.heading}
      </h2>
      <ul className="grid grid-cols-2 gap-px border-2 border-enamel-line bg-enamel-line lg:mt-2 lg:block lg:border-0 lg:border-t-2 lg:bg-transparent">
        {analysis.checks.map((check) => {
          const Icon = STATUS_ICON[check.status];
          const extra = detail(check);

          return (
            <li
              key={check.id}
              className="bg-enamel px-3 py-2.5 lg:flex lg:min-h-12 lg:items-center lg:justify-between lg:gap-3 lg:border-b lg:border-enamel-line lg:px-0 lg:py-2"
            >
              <span>
                <span className="block text-sm lg:text-base">{t.checks[check.id]}</span>
                {extra !== null && (
                  <span className="block text-xs text-chalk lg:text-sm">{extra}</span>
                )}
              </span>
              <span
                className={`mt-1 flex items-center gap-1.5 font-display text-base font-semibold tracking-wider uppercase lg:mt-0 lg:shrink-0 lg:text-lg ${STATUS_TONE[check.status]}`}
              >
                <Icon aria-hidden className="size-4 lg:size-5" strokeWidth={3} />
                {t.checks.result[check.id][check.status]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
