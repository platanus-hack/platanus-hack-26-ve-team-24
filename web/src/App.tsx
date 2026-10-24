import { LoaderCircle } from "lucide-react";
import { ChecksList } from "./components/ChecksList";
import { EmptyState } from "./components/EmptyState";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { ProofPanel } from "./components/ProofPanel";
import { SessionForm } from "./components/SessionForm";
import { StationLine } from "./components/StationLine";
import { VerdictBanner } from "./components/VerdictBanner";
import { formatDateTime } from "./features/verify/format";
import { useVerification, type VerificationState } from "./features/verify/use-verification";
import { useI18n } from "./i18n";

function Wordmark() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2.5">
      <svg aria-hidden viewBox="0 0 32 32" className="size-8" fill="none">
        <path
          d="M6 28 V14 L16 4"
          stroke="var(--color-cobalt)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="21" cy="9" r="6" fill="var(--color-enamel)" stroke="white" strokeWidth="3.5" />
      </svg>
      <span className="font-display text-2xl font-bold tracking-[0.14em]">{t.app.name}</span>
    </div>
  );
}

function LoadingBanner() {
  const { t } = useI18n();

  return (
    <section role="status" className="bg-enamel-raised px-5 py-5">
      <div className="flex items-center gap-3">
        <LoaderCircle
          aria-hidden
          className="size-9 shrink-0 animate-spin motion-reduce:animate-none"
        />
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-wide uppercase">
          {t.loading.title}
        </h1>
      </div>
      <p className="mt-3 max-w-[48ch] text-base leading-snug text-chalk">{t.loading.body}</p>
    </section>
  );
}

function Result({ state }: { state: VerificationState }) {
  const { t, locale } = useI18n();

  if (state.status === "idle") return null;
  if (state.status === "loading") return <LoadingBanner />;

  if (state.status === "unavailable") {
    return (
      <VerdictBanner
        verdict="unverifiable"
        title={t.verdict.unverifiable.title}
        body={t.verdict.unverifiable[state.reason]}
        footer={null}
        note={null}
        analysis={null}
      />
    );
  }

  const { analysis, checkedAt } = state;
  const { verdict, unverifiableReason } = analysis;

  return (
    <VerdictBanner
      verdict={verdict}
      title={t.verdict[verdict].title}
      body={
        verdict === "unverifiable"
          ? t.verdict.unverifiable[unverifiableReason ?? "error"]
          : t.verdict[verdict].body
      }
      footer={t.verdict.checkedAt(formatDateTime(checkedAt, locale))}
      note={analysis.evidence.synthetic ? t.form.synthetic : null}
      analysis={analysis}
    />
  );
}

export default function App() {
  const { state, verify } = useVerification();
  const initialId = new URLSearchParams(window.location.search).get("s") ?? "";
  const analysis = state.status === "done" ? state.analysis : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between border-b-2 border-enamel-line py-3">
        <Wordmark />
        <LanguageSwitch />
      </header>
      <main className="mt-5 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
        {/* El orden del DOM es el orden de lectura en móvil; en escritorio son dos columnas. */}
        <div className="contents lg:block lg:space-y-6">
          <SessionForm
            initialId={initialId}
            loading={state.status === "loading"}
            onVerify={(id) => void verify(id)}
          />
          <Result state={state} />
          {analysis !== null && <ChecksList analysis={analysis} />}
        </div>
        <div className="contents lg:block lg:space-y-6">
          {analysis === null ? (
            state.status === "idle" && <EmptyState />
          ) : (
            <>
              <StationLine analysis={analysis} />
              <ProofPanel analysis={analysis} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
