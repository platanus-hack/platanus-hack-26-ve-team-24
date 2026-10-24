import { useState, type SyntheticEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { SAMPLE_INTACT_ID, SAMPLE_TAMPERED_ID } from "../features/verify/fixtures";
import { useI18n } from "../i18n";

type Props = {
  initialId: string;
  loading: boolean;
  onVerify: (sessionId: string) => void;
};

export function SessionForm({ initialId, loading, onVerify }: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialId);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onVerify(value);
  };

  const runSample = (sessionId: string) => {
    setValue(sessionId);
    onVerify(sessionId);
  };

  const samples = [
    { id: SAMPLE_INTACT_ID, label: t.form.sampleIntact },
    { id: SAMPLE_TAMPERED_ID, label: t.form.sampleTampered },
  ];

  return (
    <form onSubmit={submit} className="space-y-3">
      <label
        htmlFor="session-id"
        className="block font-display text-xl font-semibold tracking-wide"
      >
        {t.form.label}
      </label>
      <div className="flex">
        <input
          id="session-id"
          name="session-id"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t.form.placeholder}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="min-h-12 min-w-0 flex-1 border-2 border-r-0 border-enamel-edge bg-enamel-950 px-3 font-mono text-base text-porcelain placeholder:text-chalk/70"
        />
        <button
          type="submit"
          disabled={loading || value.trim() === ""}
          className="inline-flex min-h-12 items-center gap-2 bg-cobalt px-4 font-display text-xl font-semibold uppercase tracking-wider text-porcelain transition-colors hover:bg-[#3a70ff] active:bg-[#1748cc] disabled:cursor-not-allowed disabled:bg-enamel-line disabled:text-chalk"
        >
          {loading ? t.form.loading : t.form.submit}
          {loading ? (
            <LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <ArrowRight aria-hidden className="size-5" />
          )}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="sr-only">{t.form.samples}</span>
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => runSample(sample.id)}
            className="min-h-11 border-2 border-enamel-edge px-3 text-sm font-semibold text-porcelain transition-colors hover:border-porcelain hover:bg-enamel-raised"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </form>
  );
}
