import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { formatDateTime } from "../features/verify/format";
import type { Analysis } from "../features/verify/types";
import { useI18n } from "../i18n";
import { HashValue } from "./HashValue";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-ink/15 py-2 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

export function ProofPanel({ analysis }: { analysis: Analysis }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(
    () => new URLSearchParams(window.location.search).get("proof") === "open",
  );
  const { anchor } = analysis.evidence;
  const rootCheck = analysis.checks.find((check) => check.id === "root");

  return (
    <section aria-labelledby="proof-title" className="on-porcelain bg-porcelain text-ink">
      <h2 id="proof-title" className="sr-only">
        {t.proof.heading}
      </h2>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="proof-body"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left font-display text-2xl font-semibold tracking-wide uppercase"
      >
        {open ? t.proof.close : t.proof.open}
        <ChevronDown
          aria-hidden
          className={`size-6 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id="proof-body" className="space-y-4 px-5 pb-5">
          <p className="max-w-[60ch] text-sm leading-relaxed text-ink-soft">{t.proof.explain}</p>
          <HashValue label={t.proof.foundRoot} value={analysis.recomputedRoot} />
          {anchor !== null && (
            <HashValue
              label={t.proof.expectedRoot}
              value={anchor.root}
              flagged={rootCheck?.status === "fail"}
            />
          )}
          {anchor !== null && (
            <dl>
              <Fact label={t.proof.network} value={anchor.network} />
              <Fact
                label={t.proof.anchoredAt}
                value={
                  anchor.anchoredAt === null
                    ? t.proof.none
                    : formatDateTime(anchor.anchoredAt, locale)
                }
              />
              {anchor.contract !== null && (
                <Fact label={t.proof.contract} value={anchor.contract} />
              )}
            </dl>
          )}
          {anchor?.explorerUrl != null && (
            <a
              href={anchor.explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-cobalt underline underline-offset-4"
            >
              {t.proof.explorer}
              <ExternalLink aria-hidden className="size-4" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
