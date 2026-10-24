import { CircleCheck, CircleHelp, OctagonX, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Analysis, Verdict } from "../features/verify/types";
import { useI18n } from "../i18n";

type Tone = { surface: string; icon: LucideIcon; roundel: string };

const TONES: Record<Verdict, Tone> = {
  verified: { surface: "bg-green text-ink", icon: CircleCheck, roundel: "text-green" },
  altered: { surface: "bg-scarlet text-porcelain", icon: OctagonX, roundel: "text-scarlet" },
  deleted: { surface: "bg-amber text-ink", icon: TriangleAlert, roundel: "text-ink" },
  altered_deleted: {
    surface: "bg-scarlet text-porcelain",
    icon: OctagonX,
    roundel: "text-scarlet",
  },
  unverifiable: {
    surface: "bg-enamel-line text-porcelain",
    icon: CircleHelp,
    roundel: "text-enamel",
  },
};

type Props = {
  verdict: Verdict;
  title: string;
  body: string;
  footer: string | null;
  note: string | null;
  analysis: Analysis | null;
};

function formatMissing(missing: number[], and: string): string {
  if (missing.length <= 3) {
    const head = missing.slice(0, -1).join(", ");

    return head === "" ? String(missing[0]) : `${head} ${and} ${missing.at(-1)}`;
  }

  return `${missing.slice(0, 3).join(", ")} … (+${missing.length - 3})`;
}

export function VerdictBanner({ verdict, title, body, footer, note, analysis }: Props) {
  const { t, lang } = useI18n();
  const { surface, icon: Icon, roundel } = TONES[verdict];
  const missing = analysis?.missing ?? [];
  const missingText =
    missing.length === 0
      ? null
      : t.verdict.missing(formatMissing(missing, lang === "es" ? "y" : "and"), missing.length);
  const bothProblems = verdict === "altered_deleted";

  return (
    <section
      aria-labelledby="verdict-title"
      role="status"
      className={`plate overflow-hidden pt-4 ${surface}`}
    >
      <p className="sr-only">{t.verdict.heading}</p>
      <div className="px-5">
        <div className="flex items-center gap-3">
          {/* Roundel: el distintivo de línea del plano */}
          <span
            aria-hidden
            className={`grid size-12 shrink-0 place-items-center rounded-full bg-porcelain ${roundel}`}
          >
            <Icon className="size-8" strokeWidth={2.5} />
          </span>
          <h1
            id="verdict-title"
            className="font-display text-4xl leading-[0.95] font-bold tracking-wide text-balance uppercase sm:text-5xl"
          >
            {title}
          </h1>
        </div>
        <p className="mt-3 max-w-[48ch] text-base leading-snug">{body}</p>
        {missingText !== null && !bothProblems && (
          <p className="mt-2 text-base font-semibold">{missingText}</p>
        )}
        {footer !== null && <p className="mt-4 text-sm">{footer}</p>}
        {note !== null && <p className="mt-1 text-sm">{note}</p>}
      </div>
      {bothProblems ? (
        <p className="mt-4 bg-amber px-5 py-2.5 text-base font-semibold text-ink">{missingText}</p>
      ) : (
        <div className="h-4" />
      )}
    </section>
  );
}
