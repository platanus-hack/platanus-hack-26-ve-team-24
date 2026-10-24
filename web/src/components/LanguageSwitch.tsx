import { useI18n, type Lang } from "../i18n";

const LANGS: Lang[] = ["es", "en"];

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t.lang.label} className="flex border-2 border-enamel-edge">
      {LANGS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
          className="min-h-11 min-w-11 px-3 font-display text-lg font-semibold tracking-widest text-chalk aria-pressed:bg-porcelain aria-pressed:text-ink"
        >
          {t.lang[option]}
        </button>
      ))}
    </div>
  );
}
