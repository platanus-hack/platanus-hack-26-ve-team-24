import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./en";
import { es, type Messages } from "./es";

export type Lang = "es" | "en";

const STORAGE_KEY = "audgentic.lang";
const DICTIONARIES: Record<Lang, Messages> = { es, en };

type I18n = { lang: Lang; setLang: (lang: Lang) => void; t: Messages; locale: string };

const I18nContext = createContext<I18n | null>(null);

const isLang = (value: string | null): value is Lang => value === "es" || value === "en";

/** ?lang= gana sobre lo guardado, para que un QR pueda fijar el idioma. */
function initialLang(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  const stored = localStorage.getItem(STORAGE_KEY);

  return [fromUrl, stored].find(isLang) ?? "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: DICTIONARIES[lang], locale: lang === "es" ? "es-VE" : "en-US" }),
    [lang],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const context = use(I18nContext);

  if (context === null) {
    throw new Error("useI18n requiere I18nProvider");
  }

  return context;
}
